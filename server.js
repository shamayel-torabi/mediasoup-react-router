import compression from "compression";
import express from "express";
import morgan from "morgan";
import { createServer } from "node:http";
import { Server } from "socket.io";
import createWorkers from "./mediasoup/utilities/createWorkers.js";
import Client from "./mediasoup/classes/Client.js";
import getWorker from "./mediasoup/utilities/getWorker.js";
import Room from "./mediasoup/classes/Room.js";

// Short-circuit the type-checking of the built output.
const BUILD_PATH = "./build/server/index.js";
const DEVELOPMENT = process.env.NODE_ENV === "development";
const PORT = Number.parseInt(process.env.PORT || "3000");

const app = express();

app.use(compression());
app.disable("x-powered-by");

if (DEVELOPMENT) {
  console.log("Starting development server");
  const viteDevServer = await import("vite").then((vite) =>
    vite.createServer({
      server: { middlewareMode: true },
    })
  );
  app.use(viteDevServer.middlewares);
  app.use(async (req, res, next) => {
    try {
      const source = await viteDevServer.ssrLoadModule("./server/app.ts");
      return await source.app(req, res, next);
    } catch (error) {
      if (typeof error === "object" && error instanceof Error) {
        viteDevServer.ssrFixStacktrace(error);
      }
      next(error);
    }
  });
} else {
  console.log("Starting production server");
  app.use(
    "/assets",
    express.static("build/client/assets", { immutable: true, maxAge: "1y" })
  );
  app.use(express.static("build/client", { maxAge: "1h" }));
  app.use(await import(BUILD_PATH).then((mod) => mod.app));
}

app.use(morgan("tiny"));

const httpServer = createServer(app);
const io = new Server(httpServer);

//our globals
//init workers, it's where our mediasoup workers will live
/**
 * @type {null}
 */
let workers = null;
// router is now managed by the Room object
// master rooms array that contains all our Room object
/**
 * @type {any[]}
 */
const rooms = [];

//initMediaSoup gets mediasoup ready to do its thing
const initMediaSoup = async () => {
  workers = await createWorkers();
  // console.log(workers)
};

initMediaSoup(); //build our mediasoup server/sfu

const connections = io.of("/mediasoup");

connections.on("connection", (socket) => {
  console.log("Peer connected");
  let client; //this client object available to all our socket listeners

  socket.emit("connectionSuccess", { socketId: socket.id });

  socket.on("disconnect", () => {
    console.log("Peer disconnected");
  });

  socket.on("createRoom", async ({ roomName }, ackCb) => {
    const workerToUse = await getWorker(workers);
    const requestedRoom = new Room(roomName, workerToUse);
    await requestedRoom.createRouter(io);
    rooms.push(requestedRoom);

    socket.join(requestedRoom.id);

    ackCb({
      roomId: requestedRoom.id,
    });
  });

  socket.on("joinRoom", async ({ userName, roomId }, ackCb) => {
    let requestedRoom = rooms.find((room) => room.id === roomId);

    if (requestedRoom) {
      client = new Client(userName, requestedRoom, socket);

      ackCb({
        routerRtpCapabilities: client.room.router.rtpCapabilities,
        messages: client.room.messages,
      });
    } else {
      console.log(`room with Id:${roomId} not found`);
      ackCb({ error: "جلسه با این مشخصات موجود نمی باشد" });
    }
  });

  socket.on("sendMessage", ({ text, userName, roomId }) => {
    const message = {
      id: crypto.randomUUID().toString(),
      text,
      userName,
      date: new Date().toISOString(),
    };
    const requestedRoom = rooms.find((room) => room.id === roomId);

    if (requestedRoom) {
      requestedRoom.addMessage(message);
      connections.to(requestedRoom.id).emit("newMessage", message);
    } else {
      console.log(`room with Id:${roomId} not found`);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
