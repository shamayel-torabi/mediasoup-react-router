import type {
  Device,
  DtlsParameters,
  RtpParameters,
  TransportOptions,
} from "mediasoup-client/types";

const createProducerTransport = (
  requestTransport: (
    type: string,
    audioPid?: string
  ) => Promise<TransportOptions | undefined>,
  connectTransport: (
    dtlsParameters: DtlsParameters,
    type: string,
    audioPid?: string
  ) => Promise<{ status: string } | undefined>,
  startProducing: (
    kind: string,
    rtpParameters: RtpParameters
  ) => Promise<{ id: string; error?: unknown } | undefined>,
  device: Device
) =>
  new Promise(async (resolve, reject) => {
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

export default createProducerTransport;
