import type {
  Consumer,
  ConsumerOptions,
  Device,
  DtlsParameters,
  RtpCapabilities,
  RtpParameters,
  Transport,
  TransportOptions,
} from "mediasoup-client/types";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { Message, ConsumeData } from "~/types";

interface ServerToClientEvents {
  connectionSuccess: (data: { socketId: string }) => void;
  newMessage: (message: Message) => void;
  newProducersToConsume: (consumeData: ConsumeData) => void;
  updateActiveSpeakers: (newListOfActives: string[]) => Promise<void>
}

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
  joinRoom: (
    data: { userName: string; roomId: string },
    ackCb: ({ consumeData, newRoom, messages }: {
      consumeData: ConsumeData
      newRoom: boolean;
      messages: Message[];
    }) => void
  ) => void;
  requestTransport: (
    { type, audioPid }: { type: string; audioPid?: string },
    ackCb: (clientTransportParams: TransportOptions) => void
  ) => void;
  connectTransport: (
    {
      dtlsParameters,
      type,
      audioPid,
    }: { dtlsParameters: DtlsParameters; type: string; audioPid?: string },
    ackCb: ({ status }: { status: string }) => void
  ) => void;
  startProducing: (
    { kind, rtpParameters }: { kind: string; rtpParameters: RtpParameters },
    ackCb: ({ id, error }: { id: string; error?: unknown }) => void
  ) => void;
  audioChange: (typeOfChange: string) => void;
  consumeMedia: (
    {
      rtpCapabilities,
      producerId,
      kind,
    }: { rtpCapabilities: RtpCapabilities; producerId: string; kind: string },
    ackCb: ({
      consumerOptions,
      status,
    }: {
      consumerOptions: ConsumerOptions;
      status?: string;
    }) => void
  ) => void;
  unpauseConsumer: (
    { pid, kind }: { pid: string; kind: string },
    ackCb: () => void
  ) => void;
}

export const useSocket = (
  recievMessage: (newMessage: Message) => void,
  requestTransportToConsume: (consumeData: ConsumeData) => void,
  updateListOfActives: (newListOfActives: string[]) => Promise<void>,
) => {
  const [socket, setSocket] =
    useState<Socket<ServerToClientEvents, ClientToServerEvents>>();

  useEffect(() => {
    const clientSocket: Socket<ServerToClientEvents, ClientToServerEvents> =
      io("/mediasoup");

    clientSocket.on("connectionSuccess", (data) => {
      console.log(`Connection socketId: ${data.socketId}`);
    });

    clientSocket.on("newMessage", (message) => {
      recievMessage(message);
    });

    clientSocket.on('newProducersToConsume', consumeData => {
      requestTransportToConsume(consumeData)
    });

    clientSocket.on('updateActiveSpeakers', async newListOfActives => {
      await updateListOfActives(newListOfActives)
    })

    setSocket(clientSocket);

    return () => {
      clientSocket.disconnect();
    };
  }, []);

  const socketSendMessage = async (
    text: string,
    userName: string,
    roomId: string
  ) => {
    socket?.emit("sendMessage", { text, userName, roomId });
  };

  const socketJoinRoom = async (userName: string, roomId: string) => {
    const joinRoomResp = await socket?.emitWithAck("joinRoom", {
      userName,
      roomId,
    });


    return joinRoomResp;
  };

  const requestTransport = async (type: string, audioPid?: string) => {
    return await socket?.emitWithAck("requestTransport", { type, audioPid });
  };

  const connectTransport = async (
    dtlsParameters: DtlsParameters,
    type: string,
    audioPid?: string
  ) => {
    const connectResp = await socket?.emitWithAck("connectTransport", {
      dtlsParameters,
      type,
      audioPid,
    });

    return connectResp;
  };

  const startProducing = async (kind: string, rtpParameters: RtpParameters) => {
    const produceResp = await socket?.emitWithAck("startProducing", {
      kind,
      rtpParameters,
    });

    return produceResp;
  };

  const audioChange = (typeOfChange: string) => {
    socket?.emit("audioChange", typeOfChange);
  };

  const consumeMedia = async (rtpCapabilities: RtpCapabilities, producerId: string, kind: string) => {
    const consumerParams = await socket?.emitWithAck("consumeMedia", {
      rtpCapabilities,
      producerId,
      kind,
    });

    return consumerParams;
  };

  const unpauseConsumer = async (pid: string, kind: string) => {
    await socket?.emitWithAck("unpauseConsumer", { pid, kind });
  };

  const createConsumer = (
    consumerTransport: Transport,
    producerId: string,
    device: Device,
    kind: string
  ) => {
    return new Promise<Consumer>(async (resolve, reject) => {
      // consume from the basics, emit the consumeMedia event, we take
      // the params we get back, and run .consume(). That gives us our track
      const consumerParams = await consumeMedia(
        device.rtpCapabilities,
        producerId,
        kind
      );
      console.log("consumerParams:", consumerParams);
      if (consumerParams?.status === "cannotConsume") {
        console.log("Cannot consume");
        resolve()
        //reject(new Error("Cannot consume"));
      } else if (consumerParams?.status === "consumeFailed") {
        console.log("Consume failed...");
        resolve()
        //reject(new Error("Consume failed..."));
      } else {
        // we got valid params! Use them to consume
        const consumer = await consumerTransport.consume(
          consumerParams?.consumerOptions!
        );
        console.log("consume() has finished");
        //const { track } = consumer;
        // add track events
        //unpause
        await unpauseConsumer(producerId, kind);
        resolve(consumer);
      }
    });
  };

  const createConsumerTransport = (
    transportParams: TransportOptions,
    device: Device,
    audioPid: string
  ) => {
    // make a downstream transport for ONE producer/peer/client (with audio and video producers)
    const consumerTransport = device.createRecvTransport(transportParams);
    consumerTransport.on("connectionstatechange", (state) => {
      console.log("==connectionstatechange==");
      console.log(state);
    });
    consumerTransport.on("icegatheringstatechange", (state) => {
      console.log("==icegatheringstatechange==");
      console.log(state);
    });
    // transport connect listener... fires on .consume()
    consumerTransport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        console.log("Transport connect event has fired!");
        // connect comes with local dtlsParameters. We need
        // to send these up to the server, so we can finish
        // the connection
        const connectResp = await connectTransport(
          dtlsParameters,
          "consumer",
          audioPid
        );
        console.log(connectResp, "connectResp is back!");
        if (connectResp?.status === "success") {
          callback(); //this will finish our await consume
        } else {
          errback(new Error("consumerTransport connect Error"));
        }
      }
    );
    return consumerTransport;
  };

  const createProducerTransport = (device: Device) => new Promise<Transport>(async (resolve, reject) => {
    // ask the server to make a transport and send params
    const producerTransportParams = await requestTransport("producer");
    // console.log(producerTransportParams)
    //use the device to create a front-end transport to send
    // it takes our object from requestTransport
    const producerTransport = device.createSendTransport(
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
        console.log("Connect running on produce...");
        const connectResp = await connectTransport(dtlsParameters, "producer");
        console.log(connectResp, "connectResp is back");
        if (connectResp?.status === "success") {
          // we are connected! move forward
          callback();
        } else if (connectResp?.status === "error") {
          // connection failed. Stop
          errback(new Error("Error connectTransport"));
        }
      }
    );
    producerTransport.on("produce", async (parameters, callback, errback) => {
      // emit startProducing
      console.log("Produce event is now running");
      const { kind, rtpParameters } = parameters;
      const produceResp = await startProducing(kind, rtpParameters);
      console.log(produceResp, "produceResp is back!");
      if (produceResp?.error === "error") {
        errback(new Error("Error startProducing"));
      } else {
        // only other option is the producer id
        callback({ id: produceResp?.id! });
      }
    });

    resolve(producerTransport);
  });

  return {
    socketSendMessage,
    socketJoinRoom,
    requestTransport,
    connectTransport,
    startProducing,
    audioChange,
    consumeMedia,
    unpauseConsumer,
    createConsumer,
    createConsumerTransport,
    createProducerTransport
  };
};
