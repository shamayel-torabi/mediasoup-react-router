// @ts-nocheck
import compression from "compression";
import express from "express";
import morgan from "morgan";
// import { createServer } from "node:http";
// import { Server } from "socket.io";
// import createWorkers from "./server-lib/utilities/createWorkers.js";
// import Client from "./server-lib/classes/Client.js";
// import getWorker from "./server-lib/utilities/getWorker.js";
// import Room from "./server-lib/classes/Room.js";

import runMediaSoupServer from './server-lib/utilities/mediaSoupServer.js'

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

runMediaSoupServer(app)
// //our globals
// //init workers, it's where our mediasoup workers will live
// /**
//  * @type {mediasoup.types.Worker}
//  */
// let workers = null;
// // router is now managed by the Room object
// // master rooms array that contains all our Room object
// /**
//  * @type {Room[]}
//  */
// const rooms = [];

// //initMediaSoup gets mediasoup ready to do its thing
// const initMediaSoup = async () => {
//   workers = await createWorkers();
//   // console.log(workers)
// };

// initMediaSoup(); //build our mediasoup server/sfu

// const httpServer = createServer(app);
// const socketio = new Server(httpServer);
// const io = socketio.of("/mediasoup");

// io.on("connection", (socket) => {
//   console.log(`Peer connected: ${socket.id}`);
//   /**
//    * @type {Client}
//    */
//   let client; //this client object available to all our socket listeners

//   socket.emit("connectionSuccess", { socketId: socket.id });

//   socket.on("disconnect", () => {
//     console.log(`Peer disconnected ${socket.id}`);
//     if (client) {
//       client.close();
//     }
//   });
//   socket.on("sendMessage", ({ text, userName, roomId }) => {
//     const requestedRoom = rooms.find((room) => room.id === roomId);

//     if (requestedRoom) {
//       const message = {
//         id: crypto.randomUUID().toString(),
//         text,
//         userName,
//         date: new Date().toISOString(),
//       };

//       requestedRoom.addMessage(message);
//       io.to(requestedRoom.id).emit("newMessage", message);
//     } else {
//       console.log(`room with Id:${roomId} not found`);
//     }
//   });
//   socket.on("joinRoom", async ({ userName, roomId }, ackCb) => {
//     let newRoom = false;
//     /**
//      * @type {Room}
//      */
//     let requestedRoom = rooms.find((room) => room.id === roomId);

//     if (!requestedRoom) {
//       newRoom = true;
//       // make the new room, add a worker, add a router
//       const workerToUse = await getWorker(workers);
//       requestedRoom = new Room(roomId, workerToUse);
//       requestedRoom.on("close", () => {
//         console.log("Room closed");
//       });
//       await requestedRoom.createRouter(io);
//       rooms.push(requestedRoom);
//     }

//     client = new Client(userName, requestedRoom, socket);
//     client.on("close", () => {
//       console.log(`client ${client.userName} closed`);
//     });

//     socket.join(client.room.id);

//     const { audioPidsToCreate, videoPidsToCreate, associatedUserNames } =
//       client.room.pidsToCreate();

//     ackCb({
//       consumeData: {
//         routerRtpCapabilities: client.room.router.rtpCapabilities,
//         audioPidsToCreate,
//         videoPidsToCreate,
//         associatedUserNames,
//         activeSpeakerList: client.room.activeSpeakerList.slice(0, 5),
//       },
//       newRoom,
//       messages: client.room.messages,
//     });
//   });
//   socket.on("requestTransport", async ({ type, audioPid }, ackCb) => {
//     // whether producer or consumer, client needs params
//     let clientTransportParams;
//     if (type === "producer") {
//       // run addClient, which is part of our Client class
//       clientTransportParams = await client.addTransport(type);
//     } else if (type === "consumer") {
//       // we have 1 trasnport per client we are streaming from
//       // each trasnport will have an audio and a video producer/consumer
//       // we know the audio Pid (because it came from dominantSpeaker), get the video

//       const videoPid = client.room.getProducingVideo(audioPid);
//       clientTransportParams = await client.addTransport(
//         type,
//         audioPid,
//         videoPid
//       );
//     }
//     ackCb(clientTransportParams);
//   });
//   socket.on("connectTransport", async ({ dtlsParameters, type, audioPid }, ackCb) => {
//       if (type === "producer") {
//         try {
//           await client.upstreamTransport.connect({ dtlsParameters });
//           ackCb({ status: "success" });
//         } catch (error) {
//           console.log(error);
//           ackCb({ status: "error" });
//         }
//       } else if (type === "consumer") {
//         // find the right transport, for this consumer
//         try {
//           const downstreamTransport = client.downstreamTransports.find((t) => {
//             return t.associatedAudioPid === audioPid;
//           });
//           downstreamTransport.transport.connect({ dtlsParameters });
//           ackCb({ status: "success" });
//         } catch (error) {
//           console.log(error);
//           ackCb({ status: "error" });
//         }
//       }
//     }
//   );
//   socket.on("startProducing", async ({ kind, rtpParameters }, ackCb) => {
//     // create a producer with the rtpParameters we were sent
//     try {
//       const newProducer = await client.upstreamTransport.produce({
//         kind,
//         rtpParameters,
//       });
//       //add the producer to this client obect
//       client.addProducer(kind, newProducer);
//       // if (kind === "audio") {
//       //   client.room.activeSpeakerList.push(newProducer.id);
//       // }
//       // the front end is waiting for the id
//       ackCb({ id: newProducer.id });
//     } catch (err) {
//       console.log(err);
//       ackCb({ error: err });
//     }

//     // run updateActiveSpeakers
//     const newTransportsByPeer = client.room.updateActiveSpeakers(io);
//     // newTransportsByPeer is an object, each property is a socket.id that
//     // has transports to make. They are in an array, by pid
//     for (const [socketId, audioPidsToCreate] of Object.entries(
//       newTransportsByPeer
//     )) {
//       // we have the audioPidsToCreate this socket needs to create
//       // map the video pids and the username
//       const videoPidsToCreate = audioPidsToCreate.map((aPid) => {
//         const producerClient = client.room.clients.find(
//           (c) => c?.producer?.audio?.id === aPid
//         );
//         return producerClient?.producer?.video?.id;
//       });
//       const associatedUserNames = audioPidsToCreate.map((aPid) => {
//         const producerClient = client.room.clients.find(
//           (c) => c?.producer?.audio?.id === aPid
//         );
//         return producerClient?.userName;
//       });
//       io.to(socketId).emit("newProducersToConsume", {
//         routerRtpCapabilities: client.room.router.rtpCapabilities,
//         audioPidsToCreate,
//         videoPidsToCreate,
//         associatedUserNames,
//         activeSpeakerList: client.room.activeSpeakerList.slice(0, 5),
//       });
//     }
//   });
//   socket.on("consumeMedia", async ({ rtpCapabilities, producerId, kind }, ackCb) => {
//       // will run twice for every peer to consume... once for video, once for audio
//       console.log("consumeMedia Kind: ", kind, "   producerId:", producerId);
//       // we will set up our clientConsumer, and send back the params
//       // use the right transport and add/update the consumer in Client
//       // confirm canConsume
//       try {
//         if (!client.room.router.canConsume({ producerId, rtpCapabilities })) {
//           ackCb({ status: "cannotConsume" });
//         } else {
//           const downstreamTransport = client.downstreamTransports.find((t) => {
//             if (kind === "audio") {
//               return t.associatedAudioPid === producerId;
//             } else if (kind === "video") {
//               return t.associatedVideoPid === producerId;
//             }
//           });

//           //console.log('consumeMedia downstreamTransport:', downstreamTransport)

//           // we can consume!
//           if (downstreamTransport) {
//             // create the consumer with the transport
//             const newConsumer = await downstreamTransport.transport.consume({
//               producerId: producerId,
//               rtpCapabilities,
//               paused: true, //good practice
//             });

//             console.log("consumeMedia newConsumer:", newConsumer);
//             // add this newCOnsumer to the CLient
//             client.addConsumer(kind, newConsumer, downstreamTransport);
//             // respond with the params
//             const clientParams = {
//               producerId,
//               id: newConsumer.id,
//               kind: newConsumer.kind,
//               rtpParameters: newConsumer.rtpParameters,
//             };
//             ackCb({ clientParams });
//           } else {
//             ackCb({ status: "downstreamTransport is null" });
//           }
//         }
//       } catch (err) {
//         console.log(err);
//         ackCb({ status: "consumeFailed" });
//       }
//     }
//   );
//   socket.on("audioChange", (typeOfChange) => {
//     if (typeOfChange === "mute") {
//       client?.producer?.audio?.pause();
//     } else {
//       client?.producer?.audio?.resume();
//     }
//   });
//   socket.on("unpauseConsumer", async ({ pid, kind }, ackCb) => {
//     const consumerToResume = client.downstreamTransports.find((t) => {
//       return t?.[kind].producerId === pid;
//     });
//     await consumerToResume[kind].resume();
//     ackCb();
//   });
// });

// // httpsServer.liste

// httpServer.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });
