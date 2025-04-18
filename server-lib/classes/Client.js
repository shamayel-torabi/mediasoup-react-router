// @ts-nocheck
import { EventEmitter } from "node:events";
import config from "../config.js";

class Client extends EventEmitter {
  /**
   * @param {string} userName
   * @param {import("./Room.js").default} room
   * @param {import("socket.io").Socket<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>} socket
   */
  constructor(userName, room, socket) {
    super();
    this.userName = userName;
    this.socket = socket;
    //instead of calling this producerTransport, call it upstream, THIS client's transport
    // for sending data
    this.upstreamTransport = null;
    //we will have an audio and video consumer
    this.producer = {};
    //instead of calling this consumerTransport, call it downstream,
    // THIS client's transport for pulling data
    /**
     * @type {{ transport: import("mediasoup/types").WebRtcTransport<import("mediasoup/types").AppData>; //will handle both audio and video
    associatedVideoPid: null; associatedAudioPid: null; }[]}
     */
    this.downstreamTransports = [];
    // {
    // transport,
    // associatedVideoPid
    // associatedAudioPid
    // audio = audioConsumer
    // video  = videoConsumer
    // }

    //an array of consumers, each with 2 parts
    // this.consumers = []
    // this.rooms = []
    this.room = room; // this will be a Room object
    this.room.addClient(this);
  }

  close() {
    // if (this.upstreamTransport) {
    //   this.upstreamTransport.close();
    //   this.downstreamTransports.forEach((downstreamTransport) =>
    //     downstreamTransport.transport.close()
    //   );
    // }

    this.emit("close");
  }

  /**
   * @param {string | null} audioPid
   */
  getDownstreamTransport(audioPid) {
    return this.downstreamTransports.find((t) => t?.associatedAudioPid === audioPid);
  }

  getDownstreamConsumer(pid, kind){
    const consumerToResume = this.downstreamTransports.find((t) => {
      return t[kind]?.producerId === pid;
    });
  }

  /**
   * @param {string} type
   */
  addTransport(type, audioPid = null, videoPid = null) {
    return new Promise(async (resolve, reject) => {
      const { listenIps, initialAvailableOutgoingBitrate, maxIncomingBitrate } =
        config.webRtcTransport;
      const transport = await this.room.router?.createWebRtcTransport({
        enableUdp: true,
        enableTcp: true, //always use UDP unless we can't
        preferUdp: true,
        listenInfos: listenIps,
        initialAvailableOutgoingBitrate,
      });

      if (maxIncomingBitrate) {
        // maxIncomingBitrate limit the incoming bandwidth from this transport
        try {
          await transport.setMaxIncomingBitrate(maxIncomingBitrate);
        } catch (err) {
          console.log("Error setting bitrate");
          console.log(err);
        }
      }

      // console.log(transport)
      const clientTransportParams = {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      };
      if (type === "producer") {
        // set the new transport to the client's upstreamTransport
        this.upstreamTransport = transport;
        // setInterval(async()=>{
        //     const stats = await this.upstreamTransport.getStats()
        //     for(const report of stats.values()){
        //         console.log(report.type)
        //         if(report.type === "webrtc-transport"){
        //             console.log(report.bytesReceived,'-',report.rtpBytesReceived)
        //             // console.log(report)
        //         }
        //     }
        // },1000)
      } else if (type === "consumer") {
        // add the new transport AND the 2 pids, to downstreamTransports
        this.downstreamTransports.push({
          transport, //will handle both audio and video
          associatedVideoPid: videoPid,
          associatedAudioPid: audioPid,
        });
      }
      resolve(clientTransportParams);
    });
  }
  addProducer(kind, newProducer) {
    this.producer[kind] = newProducer;
    if (kind === "audio") {
      // add this to our activeSpeakerObserver
      this.room.activeSpeakerObserver.addProducer({
        producerId: newProducer.id,
      });
      this.room.activeSpeakerList.push(newProducer.id);
    }
  }
  addConsumer(kind, newConsumer, downstreamTransport) {
    downstreamTransport[kind] = newConsumer;
  }
}

export default Client;
