import {
    createContext,
    useContext,
    useEffect,
    useState
} from 'react'
import { io, Socket } from 'socket.io-client';

import mds from 'mediasoup-client/types';
import type { Message } from '~/types';
import { useUserContext } from './UserProvider';

type MediaContextType = {
    messages: Message[],
    sendMessage: (message: string) => Promise<void>,
    joinRoom: (roomName: string) => Promise<void>
}


interface ServerToClientEvents {
    connectionSuccess: (data: { socketId: string }) => void,
    newMessage: (message: Message) => void;
}

interface ClientToServerEvents {
    sendMessage: (message: string, roomName: string) => void,
    joinRoom: (
        data: { userName: string, roomName: string },
        ackCb: ({ routerRtpCapabilities, newRoom, messages }: { routerRtpCapabilities: mds.RtpCapabilities, newRoom: boolean, messages: Message[] }) => void
    ) => void
}

const MediaContext = createContext<MediaContextType>({} as MediaContextType)

export default function MediaProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents>>();
    const [messages, setMessages] = useState<Message[]>([]);
    const [room, setRoom] = useState<string>('')
    const { user } = useUserContext();

    useEffect(() => {
        const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io("/mediasoup");

        setSocket(socket);
        socket.on("connectionSuccess", (data) => {
            console.log(`socket connection Id: ${data.socketId}`)
        });
        socket.on("newMessage", (message) => {
            setMessages(prev => [...prev, message])
        })
        return () => { socket.disconnect(); };
    }, []);

    const sendMessage = async (message: string) => {
        if (room)
            socket?.emit('sendMessage', message, room);
    }

    const joinRoom = async (roomName: string) => {
        const joinRoomResp = await socket?.emitWithAck("joinRoom", { userName: user?.email!, roomName });
        if(joinRoomResp){
            setRoom(roomName)
            setMessages(joinRoomResp.messages)   
        }
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