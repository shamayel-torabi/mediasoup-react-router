import compression from "compression";
import express from "express";
import morgan from "morgan";
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import createWorkers from './lib/utilities/createWorkers.js';
import Client from "./lib/classes/Client.js";
import getWorker from "./lib/utilities/getWorker.js";
import Room from "./lib/classes/Room.js";

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

const connections = io.of('/mediasoup')

connections.on('connection', (socket) => {
  console.log('Peer connected');
  let client; //this client object available to all our socket listeners

  socket.emit("connectionSuccess", { socketId: socket.id });

  socket.on("disconnect", () => {
    console.log("Peer disconnected");
  });
  
  socket.on("sendMessage", (message, roomName) => {
    const m = { id: crypto.randomUUID().toString(), text: message };
    const requestedRoom = rooms.find((room) => room.roomName === roomName);

    if(requestedRoom){
      requestedRoom.addMessage(m)
      console.log(' requestedRoom.clients.length:', requestedRoom.clients.length)
      // for(var c of requestedRoom.clients){
      //   connections.to(c.socket.id).emit("newMessage", m); 
      // }
      connections.to(requestedRoom.roomName).emit("newMessage", m); 
    }
    else{
      console.log(`room ${roomName} not found`)
    }
  });

  socket.on("joinRoom", async ({ userName, roomName }, ackCb) => {
    let newRoom = false;
    client = new Client(userName, socket);
    let requestedRoom = rooms.find((room) => room.roomName === roomName);

    if (!requestedRoom) {
      newRoom = true;
      // make the new room, add a worker, add a router
      const workerToUse = await getWorker(workers);
      requestedRoom = new Room(roomName, workerToUse);
      await requestedRoom.createRouter(io);
      rooms.push(requestedRoom);
    }

    // add the room to the client
    client.room = requestedRoom;
    // add the client to the Room clients
    client.room.addClient(client);
    // add this socket to the socket room
    socket.join(client.room.roomName);

    ackCb({
      routerRtpCapabilities: client.room.router.rtpCapabilities,
      newRoom,
      messages: client.room.messages
    });
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
