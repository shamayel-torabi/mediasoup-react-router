import type {
  Consumer,
  DtlsParameters,
  IceCandidate,
  IceParameters,
  MediaKind,
  RtpCapabilities,
  RtpParameters,
  Transport,
} from "mediasoup-client/types";

export type Message = {
  id: string;
  text: string;
  userName: string;
  date: string;
};

export type User = {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  image: string | null;
  createdAt: Date;
};

export type MediaConsumer = {
    userName?: string;
    mediaStream?: MediaStream;
};

export type ConsumeData = {
  audioPidsToCreate: string[];
  videoPidsToCreate: string[];
  associatedUserNames: string[];
  activeSpeakerList: string[];
};

export type RemoteVideoType = {
  id: number;
  mediaStream: MediaStream;
};

export type ConsumerType = {
  combinedStream: MediaStream;
  userName: string;
  consumerTransport: Transport;
  audioConsumer: Consumer;
  videoConsumer: Consumer;
};

export type ClientTransportOptions = {
  id: string;
  iceParameters: IceParameters;
  iceCandidates: IceCandidate[];
  dtlsParameters: DtlsParameters;
};

export type ClientParamsType = {
  producerId: string;
  id: string;
  kind: MediaKind;
  rtpParameters: RtpParameters;
};

export type RoomType = {
  roomId: string;
  roomName: string;
};
