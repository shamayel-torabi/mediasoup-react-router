import {
  Device,
  type Consumer,
  type DtlsParameters,
  type MediaKind,
  type Producer,
  type RtpCapabilities,
  type RtpParameters,
  type Transport,
  type TransportOptions,
} from "mediasoup-client/types";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { ActionType, type Action } from "~/components/MediaProvider";
import type {
  Message,
  ConsumeData,
  ClientTransportOptions,
  ClientParamsType,
  RoomType,
  ConsumerType,
} from "~/types";

interface ClientToServerEvents {
  sendMessage: ({
    text,
    userName,
    roomId,
  }: {
    text: string;
    userName: string;
    roomId: string;
  }) => void;
  createRoom: (
    roomName: string,
    ackCb: (result: { roomId?: string; error?: string }) => void
  ) => void;
  joinRoom: (
    data: { userName: string; roomId: string },
    ackCb: ({
      result,
      error,
    }: {
      result?: {
        routerRtpCapabilities: RtpCapabilities;
        newRoom: boolean;
        clientId: string;
        audioPidsToCreate: string[];
        videoPidsToCreate: string[];
        associatedUserNames: string[];
        messages: Message[];
      };
      error?: string;
    }) => void
  ) => void;
  closeRoom: (
    data: { roomId: string },
    ackCb: (result: { status: string }) => void
  ) => void;
  requestTransport: (
    data: { type: string; audioPid?: string },
    ackCb: (clientTransportParams: ClientTransportOptions) => void
  ) => void;
  connectTransport: (
    data: { dtlsParameters: DtlsParameters; type: string; audioPid?: string },
    ackCb: (status: string) => void
  ) => void;
  startProducing: (
    data: { kind: MediaKind; rtpParameters: RtpParameters },
    ackCb: (result: { producerId?: string; error?: unknown }) => void
  ) => void;
  audioChange: (typeOfChange: string) => void;
  consumeMedia: (
    data: {
      rtpCapabilities: RtpCapabilities;
      producerId: string;
      kind: MediaKind;
    },
    ackCb: (result: {
      consumerOptions?: ClientParamsType;
      status?: string;
    }) => void
  ) => void;
  unpauseConsumer: (
    data: { producerId: string; kind: MediaKind },
    ackCb: ({ status }: { status: string }) => void
  ) => void;
}

interface ServerToClientEvents {
  connectionSuccess: (data: { socketId: string; rooms: RoomType[] }) => void;
  newMessage: (message: Message) => void;
  newRoom: (room: { roomId: string; roomName: string }) => void;
  newProducersToConsume: (consumeData: ConsumeData) => void;
  updateActiveSpeakers: (newListOfActives: string[]) => void;
}

export const useMediasoup = (
  dispatch: React.ActionDispatch<[action: Action]>
) => {
  const [socket, setSocket] =
    useState<Socket<ServerToClientEvents, ClientToServerEvents>>();

  const device = useRef<Device>(null);
  const producerTransport = useRef<Transport>(null);
  const audioProducer = useRef<Producer>(null);
  const videoProducer = useRef<Producer>(null);

  useEffect(() => {
    const clientSocket: Socket<ServerToClientEvents, ClientToServerEvents> =
      io("/ws");

    clientSocket.on("connectionSuccess", (data) => {
      console.log(`Connection socketId: ${data.socketId}`);
      dispatch({ type: ActionType.SET_ROOMS, payload: data.rooms });
    });

    clientSocket.on("newMessage", (message) => {
      dispatch({ type: ActionType.ADD_MESSAGE, payload: message });
    });

    clientSocket.on("newRoom", (room) => {
      dispatch({ type: ActionType.ADD_ROOM, payload: room });
    });

    clientSocket.on("newProducersToConsume", (consumeData) => {
      requestTransportToConsume(consumeData);
      updatActiveSpeakers(consumeData.audioPidsToCreate);
    });

    clientSocket.on("updateActiveSpeakers", (newListOfActives) => {
      updatActiveSpeakers(newListOfActives);
    });

    setSocket(clientSocket);

    return () => {
      clientSocket.disconnect();
    };
  }, []);

  const updatActiveSpeakers = (newListOfActives: string[]) => {
    dispatch({
      type: ActionType.SET_ACTIVE_SPEAKERS,
      payload: newListOfActives,
    });
  };

  const socketSendMessage = async (
    text: string,
    userName: string,
    roomId: string
  ) => {
    socket?.emit("sendMessage", { text, userName, roomId });
  };

  const createMediaSoupRoom = async (roomName: string) => {
    const createRoomResp = await socket?.emitWithAck("createRoom", roomName);
    return createRoomResp?.roomId;
  };

  const createConsumerTransport = (
    transportParams: TransportOptions,
    audioPid: string
  ) => {
    if (device.current) {
      // make a downstream transport for ONE producer/peer/client (with audio and video producers)
      const consumerTransport =
        device.current.createRecvTransport(transportParams);
      consumerTransport.on("connectionstatechange", (state) => {
        //console.log("==connectionstatechange==");
        //console.log(state);
      });
      consumerTransport.on("icegatheringstatechange", (state) => {
        //console.log("==icegatheringstatechange==");
        //console.log(state);
      });
      // transport connect listener... fires on .consume()
      consumerTransport.on(
        "connect",
        async ({ dtlsParameters }, callback, errback) => {
          //console.log("Transport connect event has fired!");
          // connect comes with local dtlsParameters. We need
          // to send these up to the server, so we can finish
          // the connection

          const connectResp = await socket?.emitWithAck("connectTransport", {
            dtlsParameters,
            type: "consumer",
            audioPid,
          });

          //console.log(connectResp, "connectResp is back!");
          if (connectResp === "success") {
            callback(); //this will finish our await consume
          } else {
            errback(new Error("consumerTransport connect Error"));
          }
        }
      );
      return consumerTransport;
    } else {
      throw new Error("device undefined");
    }
  };

  const createProducer = (
    localStream: MediaStream,
    producerTransport: Transport
  ) => {
    return new Promise<{ audioProducer: Producer; videoProducer: Producer }>(
      async (resolve, reject) => {
        //get the audio and video tracks so we can produce
        const videoTrack = localStream.getVideoTracks()[0];
        const audioTrack = localStream.getAudioTracks()[0];
        try {
          // running the produce method, will tell the transport
          // connect event to fire!!
          console.log("Calling produce on video");
          const videoProducer = await producerTransport.produce({
            track: videoTrack,
          });
          console.log("Calling produce on audio");
          const audioProducer = await producerTransport.produce({
            track: audioTrack,
          });
          console.log("finished producing!");
          resolve({ audioProducer, videoProducer });
        } catch (err) {
          console.log(err, "error producing");
          reject(err);
        }
      }
    );
  };

  const createProducerTransport = () =>
    new Promise<Transport>(async (resolve, reject) => {
      // ask the server to make a transport and send params
      const producerTransportParams = await socket?.emitWithAck(
        "requestTransport",
        { type: "producer" }
      );
      //console.log('producerTransportParams:', producerTransportParams)
      //use the device to create a front-end transport to send
      // it takes our object from requestTransport

      if (device.current) {
        const producerTransport = device.current.createSendTransport(
          producerTransportParams!
        );
        // console.log(producerTransport)
        producerTransport.on(
          "connect",
          async ({ dtlsParameters }, callback, errback) => {
            // transport connect event will NOT fire until transport.produce() runs
            // dtlsParams are created by the browser so we can finish
            // the other half of the connection
            // emit connectTransport
            //console.log("Connect running on produce...");

            const connectResp = await socket?.emitWithAck("connectTransport", {
              dtlsParameters,
              type: "producer",
            });

            console.log(connectResp, "connectResp is back");
            if (connectResp === "success") {
              // we are connected! move forward
              callback();
            } else if (connectResp === "error") {
              // connection failed. Stop
              errback(new Error("Error connectTransport"));
            }
          }
        );
        producerTransport.on(
          "produce",
          async (parameters, callback, errback) => {
            // emit startProducing
            //console.log("Produce event is now running");
            const { kind, rtpParameters } = parameters;

            const produceResp = await socket?.emitWithAck("startProducing", {
              kind,
              rtpParameters,
            });

            //console.log(produceResp, "produceResp is back!");
            if (produceResp?.error === "error") {
              errback(new Error("Error startProducing"));
            } else {
              // only other option is the producer id
              callback({ id: produceResp?.producerId! });
            }
          }
        );

        resolve(producerTransport!);
      } else {
        reject(new Error("device undefined"));
      }
    });

  const createConsumer = (
    consumerTransport: Transport,
    producerId: string,
    kind: MediaKind
  ) => {
    return new Promise<Consumer>(async (resolve, reject) => {
      // consume from the basics, emit the consumeMedia event, we take
      // the params we get back, and run .consume(). That gives us our track
      if (device.current) {
        const consumerParams = await socket?.emitWithAck("consumeMedia", {
          rtpCapabilities: device.current.rtpCapabilities,
          producerId,
          kind,
        });

        if (consumerParams) {
          //console.log("consumerParams:", consumerParams);
          if (consumerParams?.status === "cannotConsume") {
            console.log("Cannot consume");
            reject(new Error("Cannot consume"));
          } else if (consumerParams?.status === "consumeFailed") {
            console.log("Consume failed...");
            reject(new Error("Consume failed..."));
          } else {
            // we got valid params! Use them to consume
            const consumer = await consumerTransport.consume(
              consumerParams.consumerOptions!
            );
            //console.log("consume() has finished");
            //const { track } = consumer;
            // add track events
            //unpause
            const result = await socket?.emitWithAck("unpauseConsumer", {
              producerId,
              kind,
            });
            if (result?.status === "error")
              console.log("unpauseConsumer result", result);

            resolve(consumer);
          }
        } else {
          reject(new Error("consumerParams is null"));
        }
      } else {
        reject(new Error("device undefined"));
      }
    });
  };

  const requestTransportToConsume = (consumeData: ConsumeData) => {
    consumeData.audioPidsToCreate.forEach(async (audioPid, i) => {
      try {
        const videoPid = consumeData.videoPidsToCreate[i];

        const consumerTransportParams = await socket?.emitWithAck(
          "requestTransport",
          { type: "consumer", audioPid }
        );
        //console.log('requestTransportToConsume consumerTransportParams:', consumerTransportParams);

        if (!consumerTransportParams)
          throw new Error("consumerTransportParams undefined");

        const consumerTransport = createConsumerTransport(
          consumerTransportParams,
          audioPid
        );

        const [audioConsumer, videoConsumer] = await Promise.all([
          createConsumer(consumerTransport, audioPid, "audio"),
          createConsumer(consumerTransport, videoPid, "video"),
        ]);
        //console.log('audioConsumer: ', audioConsumer);
        //console.log('videoConsumer: ', videoConsumer);
        // create a new MediaStream on the client with both tracks
        // This is why we have gone through all this pain!!!
        const combinedStream = new MediaStream([
          audioConsumer.track,
          videoConsumer.track,
        ]);

        const consumer: Record<string, ConsumerType> = {};
        consumer[audioPid] = {
          combinedStream,
          userName: consumeData.associatedUserNames[i],
          consumerTransport,
          audioConsumer: audioConsumer,
          videoConsumer: videoConsumer,
        };

        dispatch({ type: ActionType.SET_CONSUMER, payload: consumer });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "requestTransportToConsume error";
        console.log(errorMessage);
      }
    });
  };

  const joinMediaSoupRoom = (userName: string, roomId: string) => {
    return new Promise<void>(async (resolve, reject) => {
      //console.log("joinMediaSoupRoom:", { userName, roomId });
      const joinRoomResp = await socket?.emitWithAck("joinRoom", {
        userName,
        roomId,
      });

      if (!joinRoomResp) {
        reject(new Error("result is null"));
      } else if (joinRoomResp.error) {
        reject(new Error("Error joinRoom"));
      } else {
        dispatch({
          type: ActionType.SET_MESSAGES,
          payload: joinRoomResp.result?.messages,
        });

        try {
          device.current = new Device();

          await device.current?.load({
            routerRtpCapabilities: joinRoomResp.result?.routerRtpCapabilities!,
          });
        } catch (error) {
          reject(new Error("Error creating device"));
        }

        const consumeData: ConsumeData = {
          audioPidsToCreate: joinRoomResp.result?.audioPidsToCreate!,
          videoPidsToCreate: joinRoomResp.result?.videoPidsToCreate!,
          associatedUserNames: joinRoomResp.result?.associatedUserNames!,
        };

        requestTransportToConsume(consumeData);
        updatActiveSpeakers(joinRoomResp.result?.audioPidsToCreate!);
        resolve();
      }
    });
  };

  const startPublish = async (localStream: MediaStream) => {
    try {
      const pTransport = await createProducerTransport();
      producerTransport.current = pTransport;

      const producers = await createProducer(localStream, pTransport);
      audioProducer.current = producers.audioProducer;
      videoProducer.current = producers.videoProducer;
    } catch (err) {
      console.log(err);
    }
  };

  const audioChange = () => {
    // mute at the producer level, to keep the transport, and all
    // other mechanism in place
    if (audioProducer.current?.paused) {
      // currently paused. User wants to unpause
      audioProducer.current.resume();
      // unpause on the server
      socket?.emit("audioChange", "unmute");
      return true;
    } else {
      //currently on, user wnats to pause
      audioProducer.current?.pause();
      socket?.emit("audioChange", "mute");
      return false;
    }
  };

  return {
    audioProducerId: audioProducer.current?.id,
    socketSendMessage,
    joinMediaSoupRoom,
    startPublish,
    createMediaSoupRoom,
    audioChange,
  };
};
