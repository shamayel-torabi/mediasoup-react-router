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
import type { MediaConsumer, Message } from "~/types";

interface ServerToClientEvents {
  connectionSuccess: (data: { socketId: string }) => void;
  newMessage: (message: Message) => void;
  newProducersToConsume: ({
    routerRtpCapabilities,
    audioPidsToCreate,
    videoPidsToCreate,
    associatedUserNames,
    activeSpeakerList,
  }: {
    routerRtpCapabilities: RtpCapabilities;
    audioPidsToCreate: string[];
    videoPidsToCreate: string[];
    associatedUserNames: string[];
    activeSpeakerList: string[];
  }) => void;
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
    ackCb: ({
      routerRtpCapabilities,
      newRoom,
      messages,
      audioPidsToCreate,
      videoPidsToCreate,
      associatedUserNames,
    }: {
      routerRtpCapabilities: RtpCapabilities;
      newRoom: boolean;
      messages: Message[];
      audioPidsToCreate: string[];
      videoPidsToCreate: string[];
      associatedUserNames: string[];
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
      pid,
      kind,
    }: { rtpCapabilities: RtpCapabilities; pid: string; kind: string },
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

export const useSocket = () => {
  const [socket, setSocket] =
    useState<Socket<ServerToClientEvents, ClientToServerEvents>>();
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const clientSocket: Socket<ServerToClientEvents, ClientToServerEvents> =
      io("/mediasoup");

    setSocket(clientSocket);
    clientSocket.on("connectionSuccess", (data) => {
      console.log(`socket connection Id: ${data.socketId}`);
    });

    clientSocket.on("newMessage", (message) => {
      setMessages((prev) => [...prev, message]);
    });

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

  const join = async (userName: string, roomId: string) => {
    const joinRoomResp = await socket?.emitWithAck("joinRoom", {
      userName,
      roomId,
    });

    if (joinRoomResp?.messages) {
      setMessages(joinRoomResp.messages);
    }

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

  const consumeMedia = async (
    rtpCapabilities: RtpCapabilities,
    pid: string,
    kind: string
  ) => {
    const consumerParams = await socket?.emitWithAck("consumeMedia", {
      rtpCapabilities,
      pid,
      kind,
    });

    return consumerParams;
  };

  const unpauseConsumer = async (pid: string, kind: string) => {
    await socket?.emitWithAck("unpauseConsumer", { pid, kind });
  };

  const createConsumer = (
    consumerTransport: Transport,
    pid: string,
    device: Device,
    kind: string
  ) => {
    return new Promise<Consumer | void>(async (resolve, reject) => {
      // consume from the basics, emit the consumeMedia event, we take
      // the params we get back, and run .consume(). That gives us our track
      const consumerParams = await consumeMedia(
        device.rtpCapabilities,
        pid,
        kind
      );
      console.log("consumerParams:", consumerParams);
      if (consumerParams?.status === "cannotConsume") {
        console.log("Cannot consume");
        resolve();
      } else if (consumerParams?.status === "consumeFailed") {
        console.log("Consume failed...");
        resolve();
      } else {
        // we got valid params! Use them to consume
        const consumer = await consumerTransport.consume(
          consumerParams?.consumerOptions!
        );
        console.log("consume() has finished");
        const { track } = consumer;
        // add track events
        //unpause
        await unpauseConsumer(pid, kind);
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

  const requestTransportToConsume = (
    consumeData: {
      audioPidsToCreate: string[];
      videoPidsToCreate: string[];
      associatedUserNames: string[];
    },
    device: Device
  ) => {
    const consumers =  consumeData.audioPidsToCreate.map(async (audioPid, i) => {
      const videoPid = consumeData.videoPidsToCreate[i];
      // expecting back transport params for THIS audioPid. Maybe 5 times, maybe 0
      const consumerTransportParams = await requestTransport(
        "consumer",
        audioPid
      );

      //console.log(consumerTransportParams);

      const consumerTransport = createConsumerTransport(
        consumerTransportParams!,
        device,
        audioPid
      );

      const [audioConsumer, videoConsumer] = await Promise.all([
        createConsumer(consumerTransport, audioPid, device, "audio"),
        createConsumer(consumerTransport, videoPid, device, "video"),
      ]);
      console.log(audioConsumer);
      console.log(videoConsumer);
      // create a new MediaStream on the client with both tracks
      // This is why we have gone through all this pain!!!
      const combinedStream = new MediaStream([
        audioConsumer?.track!,
        videoConsumer?.track!,
      ]);
      const remoteVideo = document.getElementById(
        `remote-video-${i}`
      ) as HTMLVideoElement;
      remoteVideo.srcObject = combinedStream;
      console.log("Hope this works...");

      return {
        combinedStream,
        userName: consumeData.associatedUserNames[i],
        consumerTransport,
        audioConsumer: audioConsumer as Consumer,
        videoConsumer: videoConsumer as Consumer,
      };
    });

    return consumers;
  };

  return {
    messages,
    socketSendMessage,
    join,
    requestTransport,
    connectTransport,
    startProducing,
    audioChange,
    consumeMedia,
    createConsumer,
    unpauseConsumer,
    createConsumerTransport,
    requestTransportToConsume,
  };
};
