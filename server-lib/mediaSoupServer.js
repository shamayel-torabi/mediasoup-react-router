// @ts-nocheck
import { createServer } from "node:http";
import { Server } from "socket.io";
import createWorkers from "./createWorkers.js";
import getWorker from "./getWorker.js";
import Room from "./classes/Room.js";
import Client from "./classes/Client.js";

const PORT = Number.parseInt(process.env.PORT || "3000");

//our globals
//init workers, it's where our mediasoup workers will live

/**
 * @type {import("mediasoup/types").Worker | null}
 */
let workers = null;
// router is now managed by the Room object
// master rooms array that contains all our Room object
/**
 * @type {Room[]}
 */
const rooms = [];

const runMediaSoupServer = async (app) => {
  workers = await createWorkers();

  const httpServer = createServer(app);
  const socketio = new Server(httpServer);
  const io = socketio.of("/mediasoup");

  io.on("connection", (socket) => {
    console.log(`Peer connected: ${socket.id}`);
    let client; //this client object available to all our socket listeners

    const currentRooms = rooms.map((room) => {
      return { roomId: room.id, roomName: room.roomName };
    });
    socket.emit("connectionSuccess", {
      socketId: socket.id,
      rooms: currentRooms,
    });

    socket.on("disconnect", () => {
      console.log(`Peer disconnected ${socket.id}`);
      if (client) {
        client.close();
      }
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
    socket.on("createRoom", async (roomName, ackCb) => {
      const workerToUse = await getWorker(workers);
      const requestedRoom = new Room(roomName, workerToUse);
      requestedRoom.on("close", () => {
        console.log("Room closed");
      });
      await requestedRoom.createRouter(io);
      rooms.push(requestedRoom);
      io.emit("newRoom", {
        roomId: requestedRoom.id,
        roomName: requestedRoom.roomName,
      });
      ackCb({ roomId: requestedRoom.id });
    });
    socket.on("joinRoom", async ({ userName, roomId }, ackCb) => {
      let newRoom = false;
      /**
       * @type {Room | undefined}
       */
      const requestedRoom = rooms.find((room) => room.id === roomId);

      if (requestedRoom) {
        client = new Client(userName, requestedRoom, socket);
        client.on("close", () => {
          console.log(`client ${client.userName} closed`);
        });

        socket.join(client.room.id);

        const { audioPidsToCreate, videoPidsToCreate, associatedUserNames } =
          client.room.pidsToCreate();

        ackCb({
          consumeData: {
            routerRtpCapabilities: client.room.router.rtpCapabilities,
            audioPidsToCreate,
            videoPidsToCreate,
            associatedUserNames,
            activeSpeakerList: client.room.activeSpeakerList.slice(0, 5),
          },
          newRoom,
          messages: client.room.messages,
        });
      } else {
        ackCb({ error: `Room with Id ${roomId} does not exist` });
      }
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

        const videoPid = client.room.getProducingVideo(audioPid);
        clientTransportParams = await client.addTransport(
          type,
          audioPid,
          videoPid
        );
      }
      ackCb(clientTransportParams);
    });
    socket.on(
      "connectTransport",
      async ({ dtlsParameters, type, audioPid }, ackCb) => {
        if (type === "producer") {
          try {
            await client.upstreamTransport.connect({ dtlsParameters });
            ackCb({ status: "success" });
          } catch (error) {
            console.log(error);
            ackCb({ status: "error" });
          }
        } else if (type === "consumer") {
          // find the right transport, for this consumer
          try {
            const downstreamTransport = client.getDownstreamTransport(audioPid);
            // const downstreamTransport = client.downstreamTransports.find(
            //   (t) => {
            //     return t.associatedAudioPid === audioPid;
            //   }
            // );
            downstreamTransport.transport.connect({ dtlsParameters });
            ackCb({ status: "success" });
          } catch (error) {
            console.log(error);
            ackCb({ status: "error" });
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
        // if (kind === "audio") {
        //   client.room.activeSpeakerList.push(newProducer.id);
        // }
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
        const videoPidsToCreate = audioPidsToCreate.map(
          (/** @type {any} */ aPid) => {
            const producerClient = client.room.clients.find(
              (c) => c?.producer?.audio?.id === aPid
            );
            return producerClient?.producer?.video?.id;
          }
        );
        const associatedUserNames = audioPidsToCreate.map(
          (/** @type {any} */ aPid) => {
            const producerClient = client.room.clients.find(
              (c) => c?.producer?.audio?.id === aPid
            );
            return producerClient?.userName;
          }
        );
        io.to(socketId).emit("newProducersToConsume", {
          routerRtpCapabilities: client.room.router.rtpCapabilities,
          audioPidsToCreate,
          videoPidsToCreate,
          associatedUserNames,
          activeSpeakerList: client.room.activeSpeakerList.slice(0, 5),
        });
      }
    });
    socket.on(
      "consumeMedia",
      async ({ rtpCapabilities, producerId, kind }, ackCb) => {
        // will run twice for every peer to consume... once for video, once for audio
        console.log("consumeMedia Kind: ", kind, "   producerId:", producerId);
        // we will set up our clientConsumer, and send back the params
        // use the right transport and add/update the consumer in Client
        // confirm canConsume
        try {
          if (!client.room.router.canConsume({ producerId, rtpCapabilities })) {
            ackCb({ status: "cannotConsume" });
          } else {
            const downstreamTransport = client.downstreamTransports.find(
              (t) => {
                if (kind === "audio") {
                  return t.associatedAudioPid === producerId;
                } else if (kind === "video") {
                  return t.associatedVideoPid === producerId;
                }
              }
            );

            //console.log('consumeMedia downstreamTransport:', downstreamTransport)

            // we can consume!
            if (downstreamTransport) {
              // create the consumer with the transport
              const newConsumer = await downstreamTransport.transport.consume({
                producerId,
                rtpCapabilities,
                paused: true, //good practice
              });

              //console.log("consumeMedia newConsumer:", newConsumer);
              // add this newCOnsumer to the CLient
              client.addConsumer(kind, newConsumer, downstreamTransport);
              // respond with the params
              const consumerOptions = {
                id: newConsumer.id,
                producerId,
                kind: newConsumer.kind,
                rtpParameters: newConsumer.rtpParameters,
              };
              ackCb({ consumerOptions });
            } else {
              ackCb({ status: "downstreamTransport is null" });
            }
          }
        } catch (err) {
          console.log(err);
          ackCb({ status: "consumeFailed" });
        }
      }
    );
    socket.on("audioChange", (typeOfChange) => {
      if (typeOfChange === "mute") {
        client?.producer?.audio?.pause();
      } else {
        client?.producer?.audio?.resume();
      }
    });
    socket.on("unpauseConsumer", async ({ pid, kind }, ackCb) => {
      // const consumerToResume = client.downstreamTransports.find((t) => {
      //   return t[kind].producerId === pid;
      // });
      try{
        const consumerToResume = client.getDownstreamConsumer(pid, kind);
        await consumerToResume[kind]?.resume();
        ackCb({ status: "success" });
      }catch(error){
        ackCb({ status: "error" });
      }
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
};

export default runMediaSoupServer;
