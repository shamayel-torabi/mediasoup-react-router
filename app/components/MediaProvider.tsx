import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState
} from 'react'

import { Consumer, Device, Producer, Transport } from 'mediasoup-client/types';
import { type MediaConsumer, type Message, type ConsumeData } from '~/types';
import { useUserContext } from './UserProvider';
import { toast } from 'sonner';
import { useSocket } from '~/hooks/useSocket';

type MediaContextType = {
    messages: Message[],
    consumers: Record<string, MediaConsumer>,
    listOfActives: string[],
    sendMessage: (text: string) => Promise<void>,
    joinRoom: (roomId: string, localMediaLeft: HTMLVideoElement) => Promise<void>
    muteAudio: () => Promise<boolean>,
}

const MediaContext = createContext<MediaContextType>({} as MediaContextType)

export default function MediaProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const { user } = useUserContext();

    const [device, setDevice] = useState<Device>();
    const [messages, setMessages] = useState<Message[]>([]);
    const [consumers, setConsumers] = useState<Record<string, MediaConsumer>>({});
    const [listOfActives, setListOfActives] = useState<string[]>([]);

    const roomId = useRef<string>(undefined)
    const isProducer = useRef<boolean>(undefined);
    const localMediaLeft = useRef<HTMLVideoElement>(undefined);
    const producerTransport = useRef<Transport>(undefined);
    const audioProducer = useRef<Producer>(undefined);
    const videoProducer = useRef<Producer>(undefined);
    const consumeData = useRef<ConsumeData>(undefined);

    const recievMessage = (newMessage: Message) => {
        setMessages((prev) => [...prev, newMessage]);
    }

    const requestTransportToConsume = (consumeData: ConsumeData) => {
        let cnsmrs: Record<string, MediaConsumer> = {};

        consumeData.audioPidsToCreate.forEach(async (audioPid, i) => {
            const videoPid = consumeData.videoPidsToCreate[i];
            // expecting back transport params for THIS audioPid. Maybe 5 times, maybe 0
            const consumerTransportParams = await requestTransport("consumer", audioPid);

            //console.log(consumerTransportParams);

            const consumerTransport = createConsumerTransport(
                consumerTransportParams!,
                device!,
                audioPid
            );

            try {
                const [audioConsumer, videoConsumer] = await Promise.all([
                    createConsumer(consumerTransport, audioPid, device!, "audio"),
                    createConsumer(consumerTransport, videoPid, device!, "video"),
                ]);
                console.log(audioConsumer);
                console.log(videoConsumer);
                // create a new MediaStream on the client with both tracks
                // This is why we have gone through all this pain!!!
                const combinedStream = new MediaStream([
                    audioConsumer.track,
                    videoConsumer.track,
                ]);


                // const remoteVideo = document.getElementById(`remote-video-${i}`) as HTMLVideoElement;
                // remoteVideo.srcObject = combinedStream;
                //console.log("Hope this works...");

                cnsmrs[audioPid] = {
                    combinedStream,
                    userName: consumeData.associatedUserNames[i],
                    consumerTransport,
                    audioConsumer: audioConsumer as Consumer,
                    videoConsumer: videoConsumer as Consumer,
                };
                setConsumers(cnsmrs);
            }
            catch (error) {
                console.log(error)
            }
        });
    }

    const updateListOfActives = async (newListOfActives: string[]) => {
        setListOfActives(newListOfActives);
    }

    const {
        socketSendMessage,
        socketJoinRoom,
        requestTransport,
        createProducerTransport,
        createConsumer,
        createConsumerTransport,
        audioChange
    } = useSocket(
        recievMessage,
        requestTransportToConsume,
        updateListOfActives
    );

    const startProducing = async () => {
        if (consumeData.current){
            requestTransportToConsume(consumeData.current);
            console.log('startProducing:', consumeData)
        }

        const localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        });

        if (localMediaLeft.current) {
            localMediaLeft.current.srcObject = localStream;
        }

        try {
            const pTransport = await createProducerTransport(device!);
            producerTransport.current = pTransport;

            const producers = await createProducer(localStream, pTransport);
            audioProducer.current = producers.audioProducer;
            videoProducer.current = producers.videoProducer
        }
        catch (err) {
            console.log(err)
        }
    }

    useEffect(() => {
        if (device) {
            startProducing();
        }
    }, [device])

    const createProducer = (localStream: MediaStream, producerTransport: Transport) => {
        return new Promise<{ audioProducer: Producer, videoProducer: Producer }>(async (resolve, reject) => {
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
        });
    }

    const sendMessage = async (text: string) => {
        if (roomId.current) {
            const userName = `${user?.firstName} ${user?.lastName}`;
            socketSendMessage(text, userName, roomId.current);
        }
    }

    const joinRoom = async (room: string, localMedia: HTMLVideoElement) => {
        localMediaLeft.current = localMedia;

        const joinRoomResp = await socketJoinRoom(user?.email!, room);

        if (joinRoomResp) {
            consumeData.current = joinRoomResp.consumeData;
            isProducer.current = joinRoomResp.newRoom;
            roomId.current = room
            setMessages(joinRoomResp.messages);

            let d = new Device();
            await d.load({
                routerRtpCapabilities: joinRoomResp.consumeData.routerRtpCapabilities,
            });

            setDevice(d);
        }
        else {
            toast('خطا هنگام پیوستن به نشست !')
        }
    }

    const muteAudio = async () => {
        // mute at the producer level, to keep the transport, and all
        // other mechanism in place
        if (audioProducer.current?.paused) {
            // currently paused. User wants to unpause
            audioProducer.current.resume();
            // unpause on the server
            audioChange("unmute");
            return true;
        } else {
            //currently on, user wnats to pause
            audioProducer.current?.pause();
            audioChange("mute");
            return false
        }
    }

    const contextValue: MediaContextType = {
        messages,
        consumers,
        listOfActives,
        sendMessage,
        joinRoom,
        muteAudio,
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