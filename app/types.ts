import type { Consumer, Transport } from "mediasoup-client/types"

export type Message = {
    id: string
    text: string
    userName: string,
    date: string
}


export type User = {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    image: string | null;
    createdAt: Date;
}

export type MediaConsumer = {
    combinedStream: MediaStream;
    userName: string;
    consumerTransport: Transport;
    audioConsumer: Consumer,
    videoConsumer: Consumer
}

