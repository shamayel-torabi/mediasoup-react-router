// @ts-nocheck
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
const socketio = new Server(httpServer);

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

const io = socketio.of("/mediasoup");

io.on("connection", (socket) => {
  console.log(`Peer connected: ${socket.id}`);
  /**
   * @type {Client}
   */
  let client; //this client object available to all our socket listeners

  socket.emit("connectionSuccess", { socketId: socket.id });

  socket.on("disconnect", () => {
    console.log(`Peer disconnected ${socket.id}`);
  });
  socket.on("sendMessage", ({ text, userName, roomId }) => {
    const requestedRoom = rooms.find((room) => room.id === roomId);

    if (requestedRoom) {
      const message = {
        id: crypto.randomUUID().toString(),
        text,
        userName,
        date: new Date().toISOString(),
      };

      requestedRoom.addMessage(message);
      io.to(requestedRoom.id).emit("newMessage", message);
    } else {
      console.log(`room with Id:${roomId} not found`);
    }
  });
  socket.on("joinRoom", async ({ userName, roomId }, ackCb) => {
    let newRoom = false;
    let requestedRoom = rooms.find((room) => room.id === roomId);

    if (!requestedRoom) {
      newRoom = true;
      // make the new room, add a worker, add a router
      const workerToUse = await getWorker(workers);
      requestedRoom = new Room(roomId, workerToUse);
      await requestedRoom.createRouter(io);
      rooms.push(requestedRoom);
    }

    client = new Client(userName, requestedRoom, socket);

    socket.join(client.room.id);

    //fetch the first 0-5 pids in activeSpeakerList
    const audioPidsToCreate = client.room.activeSpeakerList.slice(0, 5);
    //find the videoPids and make an array with matching indicies
    // for our audioPids.
    const videoPidsToCreate = audioPidsToCreate.map((aid) => {
      const producingClient = client.room.clients.find(
        (c) => c?.producer?.audio?.id === aid
      );
      return producingClient?.producer?.video?.id;
    });
    //find the username and make an array with matching indicies
    // for our audioPids/videoPids.
    const associatedUserNames = audioPidsToCreate.map((aid) => {
      const producingClient = client.room.clients.find(
        (c) => c?.producer?.audio?.id === aid
      );
      return producingClient?.userName;
    });

    ackCb({
      routerRtpCapabilities: client.room.router.rtpCapabilities,
      newRoom,
      messages: requestedRoom.messages,
      audioPidsToCreate,
      videoPidsToCreate,
      associatedUserNames,
    });
  });
  socket.on("requestTransport", async ({ type, audioPid }, ackCb) => {
    // whether producer or consumer, client needs params
    let clientTransportParams;
    if (type === "producer") {
      // run addClient, which is part of our Client class
      clientTransportParams = await client.addTransport(type);
    } else if (type === "consumer") {
      // we have 1 trasnport per client we are streaming from
      // each trasnport will have an audio and a video producer/consumer
      // we know the audio Pid (because it came from dominantSpeaker), get the video
      const producingClient = client.room.clients.find(
        (c) => c?.producer?.audio?.id === audioPid
      );
      const videoPid = producingClient?.producer?.video?.id;
      clientTransportParams = await client.addTransport(
        type,
        audioPid,
        videoPid
      );
    }
    ackCb(clientTransportParams);
  });
  socket.on( "connectTransport", async ({ dtlsParameters, type, audioPid }, ackCb) => {
      if (type === "producer") {
        try {
          await client.upstreamTransport.connect({ dtlsParameters });
          ackCb("success");
        } catch (error) {
          console.log(error);
          ackCb("error");
        }
      } else if (type === "consumer") {
        // find the right transport, for this consumer
        try {
          const downstreamTransport = client.downstreamTransports.find((t) => {
            return t.associatedAudioPid === audioPid;
          });
          downstreamTransport.transport.connect({ dtlsParameters });
          ackCb("success");
        } catch (error) {
          console.log(error);
          ackCb("error");
        }
      }
    }
  );
  socket.on("startProducing", async ({ kind, rtpParameters }, ackCb) => {
    // create a producer with the rtpParameters we were sent
    try {
      const newProducer = await client.upstreamTransport.produce({
        kind,
        rtpParameters,
      });
      //add the producer to this client obect
      client.addProducer(kind, newProducer);
      if (kind === "audio") {
        client.room.activeSpeakerList.push(newProducer.id);
      }
      // the front end is waiting for the id
      ackCb({ id: newProducer.id });
    } catch (err) {
      console.log(err);
      ackCb({ error: err });
    }

    // run updateActiveSpeakers
    const newTransportsByPeer = client.room.updateActiveSpeakers(io);
    // newTransportsByPeer is an object, each property is a socket.id that
    // has transports to make. They are in an array, by pid
    for (const [socketId, audioPidsToCreate] of Object.entries(
      newTransportsByPeer
    )) {
      // we have the audioPidsToCreate this socket needs to create
      // map the video pids and the username
      const videoPidsToCreate = audioPidsToCreate.map((aPid) => {
        const producerClient = client.room.clients.find(
          (c) => c?.producer?.audio?.id === aPid
        );
        return producerClient?.producer?.video?.id;
      });
      const associatedUserNames = audioPidsToCreate.map((aPid) => {
        const producerClient = client.room.clients.find(
          (c) => c?.producer?.audio?.id === aPid
        );
        return producerClient?.userName;
      });
      io.to(socketId).emit("newProducersToConsume", {
        routerRtpCapabilities: client.room.router.rtpCapabilities,
        audioPidsToCreate,
        videoPidsToCreate,
        associatedUserNames,
        activeSpeakerList: client.room.activeSpeakerList.slice(0, 5),
      });
    }
  });
  socket.on("audioChange", (typeOfChange) => {
    if (typeOfChange === "mute") {
      client?.producer?.audio?.pause();
    } else {
      client?.producer?.audio?.resume();
    }
  });
  socket.on("consumeMedia", async ({ rtpCapabilities, pid, kind }, ackCb) => {
    // will run twice for every peer to consume... once for video, once for audio
    console.log("Kind: ", kind, "   pid:", pid);
    // we will set up our clientConsumer, and send back the params
    // use the right transport and add/update the consumer in Client
    // confirm canConsume
    try {
      if (
        !client.room.router.canConsume({ producerId: pid, rtpCapabilities })
      ) {
        ackCb("cannotConsume");
      } else {
        // we can consume!
        const downstreamTransport = client.downstreamTransports.find((t) => {
          if (kind === "audio") {
            return t.associatedAudioPid === pid;
          } else if (kind === "video") {
            return t.associatedVideoPid === pid;
          }
        });
        // create the consumer with the transport
        const newConsumer = await downstreamTransport.transport.consume({
          producerId: pid,
          rtpCapabilities,
          paused: true, //good practice
        });
        // add this newCOnsumer to the CLient
        client.addConsumer(kind, newConsumer, downstreamTransport);
        // respond with the params
        const clientParams = {
          producerId: pid,
          id: newConsumer.id,
          kind: newConsumer.kind,
          rtpParameters: newConsumer.rtpParameters,
        };
        ackCb(clientParams);
      }
    } catch (err) {
      console.log(err);
      ackCb("consumeFailed");
    }
  });
  socket.on("unpauseConsumer", async ({ pid, kind }, ackCb) => {
    const consumerToResume = client.downstreamTransports.find((t) => {
      return t?.[kind].producerId === pid;
    });
    await consumerToResume[kind].resume();
    ackCb();
  });
});

// httpsServer.liste

httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
