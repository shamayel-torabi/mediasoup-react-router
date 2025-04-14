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
import { toast } from "sonner"

type MediaContextType = {
    messages: Message[],
    sendMessage: (text: string) => Promise<void>,
    createRoom: (roomName: string) => Promise<string | undefined>
    joinRoom: (roomId: string) => Promise<void>
}


interface ServerToClientEvents {
    connectionSuccess: (data: { socketId: string }) => void,
    newMessage: (message: Message) => void;
}

interface ClientToServerEvents {
    sendMessage: ({ text, userName, roomId }: { text: string, userName: string, roomId: string }) => void,
    createRoom: (
        { roomName }: { roomName: string },
        ackCb: ({ roomId }: { roomId: string }) => void
    ) => void,
    joinRoom: (
        data: { userName: string, roomId: string },
        ackCb: ({ routerRtpCapabilities, messages, error }: { routerRtpCapabilities: mds.RtpCapabilities, messages: Message[], error?: string }) => void
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
            //console.log('recieve message:', message)
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

    const createRoom = async (roomName: string) => {
        const createRoomResp = await socket?.emitWithAck("createRoom", { roomName });
        if (createRoomResp?.roomId) {
            return createRoomResp?.roomId;
        }
    }
    const joinRoom = async (room: string) => {
        const joinRoomResp = await socket?.emitWithAck("joinRoom", { userName: user?.email!, roomId: room });
        
        if(joinRoomResp?.error){
            console.log(joinRoomResp?.error)
            toast(joinRoomResp?.error)
            return
        }
        
        if (joinRoomResp?.messages) {
            setMessages(joinRoomResp.messages)
        }

        setRoomId(room);
    }

    const contextValue: MediaContextType = {
        messages,
        sendMessage,
        createRoom,
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