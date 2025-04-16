import {
    createContext,
    useContext,
    useState
} from 'react'

import { Device, Producer, Transport } from 'mediasoup-client/types';
import type { MediaConsumer, Message } from '~/types';
import { useUserContext } from './UserProvider';
import { toast } from 'sonner';
import { useSocket } from '~/hooks/useSocket';

type MediaContextType = {
    messages: Message[],
    sendMessage: (text: string) => Promise<void>,
    joinRoom: (roomId: string, localMediaLeft: HTMLVideoElement) => Promise<void>
    muteAudio: () => Promise<boolean>
}

const MediaContext = createContext<MediaContextType>({} as MediaContextType)

export default function MediaProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const { messages, socketSendMessage, join, requestTransportToConsume, createProducerTransport, audioChange } = useSocket();
    const [roomId, setRoomId] = useState<string>('');
    const [device, setDevice] = useState<Device>();
    const [producerTransport, setProducerTransport] = useState<Transport>();
    const [audioProducer, setAudioProducer] = useState<Producer>();
    const [videoProducer, setVideoProducer] = useState<Producer>();

    const [consumers, setConsumers] = useState<Record<string, MediaConsumer>>({})
    const { user } = useUserContext();

    const createProducer = (localStream: MediaStream, producerTransport: Transport) =>
        new Promise<{ audioProducer: Producer, videoProducer: Producer }>(async (resolve, reject) => {
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
            }
        });

    const sendMessage = async (text: string) => {
        if (roomId) {
            const userName = `${user?.firstName} ${user?.lastName}`;
            socketSendMessage(text, userName, roomId);
        }
    }

    const joinRoom = async (room: string, localMediaLeft: HTMLVideoElement) => {
        const joinRoomResp = await join(user?.email!, room);
        //console.log('joinRoomResp:', joinRoomResp)

        if (joinRoomResp) {
            setRoomId(room);
        }
        else {
            toast('خطا هنگام پیوستن به نشست !')
            return;
        }

        let d = new Device();
        await d.load({
            routerRtpCapabilities: joinRoomResp.routerRtpCapabilities,
        });

        setDevice(d);
        //console.log('device:', d);

        const aa = {
            audioPidsToCreate: joinRoomResp.audioPidsToCreate,
            videoPidsToCreate: joinRoomResp.videoPidsToCreate,
            associatedUserNames: joinRoomResp.associatedUserNames
        }

        const consumer = requestTransportToConsume(aa, d);
        setConsumers(consumer);

        const localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        });

        localMediaLeft.srcObject = localStream;

        const pTransport = await createProducerTransport(d);
        setProducerTransport(pTransport);

        const producers = await createProducer(localStream, pTransport);
        setAudioProducer(producers.audioProducer);
        setVideoProducer(producers.videoProducer);
    }

    const muteAudio = async () => {
        // mute at the producer level, to keep the transport, and all
        // other mechanism in place
        if (audioProducer?.paused) {
            // currently paused. User wants to unpause
            audioProducer.resume();
            // unpause on the server
            audioChange("unmute");
            return true;
        } else {
            //currently on, user wnats to pause
            audioProducer?.pause();
            audioChange("mute");
            return false
        }
    }

    const contextValue: MediaContextType = {
        messages,
        sendMessage,
        joinRoom,
        muteAudio
    }
    return (
        <MediaContext value={contextValue}>
            {children}
        </MediaContext>
    )
}

export const useMediaContext = () => {
    const context = useContext(MediaContext);
    if (!context) {
        throw new Error('MediaProvider not set');
    }

    return context;
}