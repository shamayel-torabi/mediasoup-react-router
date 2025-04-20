import {
    createContext,
    useContext,
    useState
} from 'react'

import { type MediaConsumer, type Message, type Room } from '~/types';
import { useUserContext } from './UserProvider';
import { toast } from 'sonner';
import { useMediasoup } from '~/hooks/useMediasoup';

type MediaContextType = {
    messages: Message[],
    rooms: Room[],
    consumers: Record<string, MediaConsumer>,
    listOfActives: string[],
    creatRoom: (roomName: string) => Promise<string>
    sendMessage: (text: string) => Promise<void>,
    joinRoom: (roomId: string) => Promise<boolean>,
    startPublish: () => Promise<MediaStream | undefined>,
    audioChange: () => boolean,
}

const MediaContext = createContext<MediaContextType>({} as MediaContextType)

export default function MediaProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const { user } = useUserContext();
    const [roomId, setRoomId] = useState('');

    const {
        messages,
        rooms,
        consumers,
        listOfActives,
        socketSendMessage,
        joinMediaSoupRoom,
        startPublish,
        createMediaSoupRoom,
        audioChange
    } = useMediasoup();


    const sendMessage = async (text: string) => {
        if (roomId) {
            const userName = `${user?.firstName} ${user?.lastName}`;
            socketSendMessage(text, userName, roomId);
        }
    }

    const joinRoom = async (room: string) => {
        const result = await joinMediaSoupRoom(user?.email!, room);
        if (!result) {
            toast('خطا هنگام پیوستن به نشست!')
            return false;
        }
        else {
            setRoomId(room);
            return true;
        }
    }

    const creatRoom = async (roomName: string) => {
        const r = await createMediaSoupRoom(roomName);
        return r || '';
    }

    const contextValue: MediaContextType = {
        messages,
        rooms,
        consumers,
        listOfActives,
        sendMessage,
        creatRoom,
        joinRoom,
        startPublish,
        audioChange,
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