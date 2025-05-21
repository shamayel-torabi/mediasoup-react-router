import { EventEmitter } from "node:events";
import { Room } from "./Room";
import { config } from "./config";
import type { DownstreamTransportType } from "./types";
import type { Consumer, MediaKind, Producer, WebRtcTransport } from "mediasoup/types";
import type { SocketType } from "./socket-server";

export class Client extends EventEmitter {
  public id: string;
  public userName: string;
  public room: Room;
  public upstreamTransport: WebRtcTransport | undefined;
  public producer: Record<string, Producer> = {};
  public downstreamTransports: DownstreamTransportType[] = [];
  private socket: SocketType;

  constructor(userName: string, room: Room, socket: SocketType) {
    super();
    this.producer = {};
    this.downstreamTransports = [];
    this.userName = userName;
    this.socket = socket;
    this.id = socket.id;
    this.room = room; // this will be a Room object
    this.room.addClient(this);
  }

  public close() {
    console.log(`Close Client with socketId: ${this.socket.id}`);
    this.room.removeClient(this);
    this.upstreamTransport?.close();
    this.downstreamTransports.forEach((tr) => tr.transport.close());
    this.emit("close");
  }

  public getDownstreamTransport(audioPid: string) {
    return this.downstreamTransports.find((t) => t?.associatedAudioPid === audioPid);
  }

  public getDownstreamConsumer(pid: string, kind: MediaKind) {
    return this.downstreamTransports.find((t) => {
      return t[kind]?.producerId === pid;
    });
  }

  public addTransport(type: "producer" | "consumer" , audioPid?: string, videoPid?: string) {
    return new Promise(async (resolve, _reject) => {
      const { listenInfos, initialAvailableOutgoingBitrate, maxIncomingBitrate } = config.webRtcTransport;
      const transport = await this.room.router?.createWebRtcTransport({
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        listenInfos: listenInfos,
        initialAvailableOutgoingBitrate,
      });
      if (maxIncomingBitrate) {
        // maxIncomingBitrate limit the incoming bandwidth from this transport
        try {
          await transport?.setMaxIncomingBitrate(maxIncomingBitrate);
        } catch (err) {
          console.log("Error setting bitrate");
          console.log(err);
        }
      }
      // console.log(transport)
      const clientTransportParams = {
        id: transport?.id,
        iceParameters: transport?.iceParameters,
        iceCandidates: transport?.iceCandidates,
        dtlsParameters: transport?.dtlsParameters,
      };
      if (type === "producer") {
        // set the new transport to the client's upstreamTransport
        this.upstreamTransport = transport;
      } else if (type === "consumer") {
        // add the new transport AND the 2 pids, to downstreamTransports
        if (transport) {
          this.downstreamTransports.push({
            transport,
            associatedVideoPid: videoPid!,
            associatedAudioPid: audioPid!,
          });
        }
      }
      resolve(clientTransportParams);
    });
  }
  
  public addProducer(kind: MediaKind, newProducer: Producer) {
    this.producer[kind] = newProducer;
    if (kind === "audio") {
      // add this to our activeSpeakerObserver
      this.room.activeSpeakerObserver?.addProducer({
        producerId: newProducer.id,
      });
      this.room.activeSpeakerList.push(newProducer?.id);
    }
  }

  public addConsumer(kind: MediaKind, newConsumer: Consumer, downstreamTransport: DownstreamTransportType) {
    downstreamTransport[kind] = newConsumer;
  }
}
