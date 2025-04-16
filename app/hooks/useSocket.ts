import type {
  DtlsParameters,
  IceCandidate,
  IceParameters,
  RtpCapabilities,
  RtpParameters,
} from "mediasoup-client/types";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { Message } from "~/types";

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
    ackCb: (clientTransportParams: {
      id: string;
      iceParameters: IceParameters;
      iceCandidates: IceCandidate;
      dtlsParameters: DtlsParameters;
    }) => void
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
      clientParams,
      status,
    }: {
      clientParams: {
        producerId: string;
        id: string;
        kind: string;
        rtpParameters: RtpParameters;
      };
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

  return { messages, socketSendMessage, join, requestTransport };
};
