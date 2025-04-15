import {
    createContext,
    useContext,
    useEffect,
    useState
} from 'react'
import { io, Socket } from 'socket.io-client';

import { type DtlsParameters, type IceCandidate, type IceParameters, type RtpCapabilities, type RtpParameters } from 'mediasoup-client/types';
import type { Message } from '~/types';
import { useUserContext } from './UserProvider';
import { toast } from 'sonner';

type MediaContextType = {
    messages: Message[],
    sendMessage: (text: string) => Promise<void>,
    joinRoom: (roomId: string) => Promise<void>
}


interface ServerToClientEvents {
    connectionSuccess: (data: { socketId: string }) => void,
    newMessage: (message: Message) => void;
    newProducersToConsume: (
        {
            routerRtpCapabilities,
            audioPidsToCreate,
            videoPidsToCreate,
            associatedUserNames,
            activeSpeakerList
        }
            : {
                routerRtpCapabilities: RtpCapabilities,
                audioPidsToCreate: string[],
                videoPidsToCreate: string[],
                associatedUserNames: string[],
                activeSpeakerList: string[]
            }) => void
}

interface ClientToServerEvents {
    sendMessage: ({ text, userName, roomId }: { text: string, userName: string, roomId: string }) => void,
    joinRoom: (
        data: { userName: string, roomId: string },
        ackCb: ({ routerRtpCapabilities, newRoom, messages }: { routerRtpCapabilities: RtpCapabilities, newRoom: boolean, messages: Message[] }) => void
    ) => void,
    requestTransport: (
        { type, audioPid }: { type: string, audioPid?: string },
        ackCb: (clientTransportParams: { id: string, iceParameters: IceParameters, iceCandidates: IceCandidate, dtlsParameters: DtlsParameters }) => void
    ) => void,
    connectTransport: (
        { dtlsParameters, type, audioPid }: { dtlsParameters: DtlsParameters, type: string, audioPid?: string },
        ackCb: (status: string) => void
    ) => void,
    startProducing: (
        { kind, rtpParameters }: { kind: string, rtpParameters: RtpParameters },
        ackCb: ({ id, error }: { id: string, error?: unknown }) => void
    ) => void,
    audioChange: (typeOfChange: string) => void,
    consumeMedia: (
        { rtpCapabilities, pid, kind }: { rtpCapabilities: RtpCapabilities, pid: string, kind: string },
        ackCb: (status: string) => void
    ) => void
}

const MediaContext = createContext<MediaContextType>({} as MediaContextType)

export default function MediaProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents>>();
    const [messages, setMessages] = useState<Message[]>([]);
    const [roomId, setRoomId] = useState<string>('')
    const { user } = useUserContext();

    useEffect(() => {
        const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io("/mediasoup");

        setSocket(socket);
        socket.on("connectionSuccess", (data) => {
            console.log(`socket connection Id: ${data.socketId}`)
        });
        socket.on("newMessage", (message) => {
            toast("پیام جدید")
            setMessages(prev => [...prev, message])
        })
        return () => { socket.disconnect(); };
    }, []);

    const sendMessage = async (text: string) => {
        if (roomId) {
            const userName = `${user?.firstName} ${user?.lastName}`;
            socket?.emit('sendMessage', { text, userName, roomId });
        }
    }

    const joinRoom = async (room: string) => {
        const joinRoomResp = await socket?.emitWithAck("joinRoom", { userName: user?.email!, roomId: room });

        if (joinRoomResp?.messages) {
            setMessages(joinRoomResp.messages)
        }

        setRoomId(room);
    }

    const contextValue: MediaContextType = {
        messages,
        sendMessage,
        joinRoom
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