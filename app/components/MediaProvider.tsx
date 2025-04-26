import {
    createContext,
    useContext,
    useReducer,
    useState
} from 'react'

import { type MediaConsumer, type Message, type RoomType } from '~/types';
import { useUserContext } from './UserProvider';
import { toast } from 'sonner';
import { useMediasoup } from '~/hooks/useMediasoup';

type MediaContextType = {
    messages: Message[];
    rooms: RoomType[];
    activeSpeakers: string[];
    consumers: Record<string, MediaConsumer>
    creatRoom: (roomName: string) => Promise<string>
    sendMessage: (text: string) => Promise<void>,
    joinRoom: (roomId: string) => Promise<boolean>,
    startPublish: () => Promise<MediaStream | undefined>,
    audioChange: () => boolean,
}

const MediaContext = createContext<MediaContextType>({} as MediaContextType)

export enum ActionType {
    SET_MESSAGES = 'SET_MESSAGES',
    ADD_MESSAGE = 'ADD_MESSAGE',
    SET_ROOMS = 'SET_ROOMS',
    ADD_ROOM = 'ADD_ROOM',
    SET_ACTIVE_SPEAKERS = 'SET_ACTIVE_SPEAKERS',
    SET_CONSUMERS = 'SET_CONSUMERS'

}
export type Action = {
    type: ActionType;
    payload: any;
}

type MediaState = {
    messages: Message[];
    rooms: RoomType[];
    activeSpeakers: string[];
    consumers: Record<string, MediaConsumer>
}

function mediaReducer(state: MediaState, action: Action) {
    const { type, payload } = action;
    switch (type) {
        case ActionType.SET_MESSAGES:
            return { ...state, messages: payload };
        case ActionType.ADD_MESSAGE:
            return { ...state, messages: [...state.messages, payload] };
        case ActionType.SET_ROOMS:
            return { ...state, rooms: payload };
        case ActionType.ADD_ROOM:
            return { ...state, rooms: [...state.rooms, payload] };
        case ActionType.SET_ACTIVE_SPEAKERS:
            return { ...state, activeSpeakers: payload };
        case ActionType.SET_CONSUMERS:
            return { ...state, consumers: payload };
        default:
            return state;
    }
}

const initState: MediaState = {
    messages: [],
    rooms: [],
    activeSpeakers: [],
    consumers: {}
}

export default function MediaProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const { user } = useUserContext();
    const [roomId, setRoomId] = useState('');
    const [state, dispatch] = useReducer(mediaReducer, initState);

    const {
        socketSendMessage,
        joinMediaSoupRoom,
        startPublish,
        createMediaSoupRoom,
        audioChange
    } = useMediasoup(dispatch);


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
        ...state,
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