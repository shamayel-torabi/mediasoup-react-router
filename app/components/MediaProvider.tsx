import {
    createContext,
    useContext,
    useEffect,
    useReducer,
} from 'react'

import { type MediaConsumer, type Message, type RoomType } from '~/types';
import { useUserContext } from './UserProvider';
import { toast } from 'sonner';
import { useMediasoup } from '~/hooks/useMediasoup';


type MediaContextType = {
    messages: Message[];
    rooms: RoomType[];
    mediaConsumers: MediaConsumer[],
    userName: string;
    creatRoom: (roomName: string) => Promise<string>;
    sendMessage: (text: string) => Promise<void>;
    joinRoom: (roomId: string) => Promise<void>;
    startPublish: (localStream: MediaStream) => Promise<void>;
    audioChange: () => boolean;
    hangUp: () => Promise<boolean>;
}

const MediaContext = createContext<MediaContextType>({} as MediaContextType)

export enum ActionType {
    SET_MESSAGES = 'SET_MESSAGES',
    ADD_MESSAGE = 'ADD_MESSAGE',
    SET_ROOMS = 'SET_ROOMS',
    SET_ROOM_ID = 'SET_ROOM_ID',
    SET_CLIENT_ID = 'SET_CLIENT_ID',
    ADD_ROOM = 'ADD_ROOM',
    SET_MEDIA_CONSUMER = 'SET_MEDIA_CONSUMER'
}
export type Action = {
    type: ActionType;
    payload: any;
}

type MediaState = {
    roomId?: string;
    clientId?: string;
    messages: Message[];
    rooms: RoomType[];
    mediaConsumers: MediaConsumer[]
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
        case ActionType.SET_ROOM_ID:
            return { ...state, roomId: payload };
        case ActionType.SET_CLIENT_ID:
            return { ...state, clientId: payload };
        case ActionType.ADD_ROOM:
            return { ...state, rooms: [...state.rooms, payload] };
        case ActionType.SET_MEDIA_CONSUMER:
            return { ...state, mediaConsumers: [...state.mediaConsumers, payload] };
        default:
            return state;
    }
}

const initState: MediaState = {
    messages: [],
    rooms: [],
    mediaConsumers: []
}

export default function MediaProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const { user } = useUserContext();
    const userName = `${user?.firstName} ${user?.lastName}`;
    const [state, dispatch] = useReducer(mediaReducer, initState);

    const {
        socketSendMessage,
        joinMediaSoupRoom,
        startPublish,
        createMediaSoupRoom,
        audioChange,
        closeClient
    } = useMediasoup(dispatch);


    useEffect(() => {
        const join = (userName: string, roomId: string) => {
            try {
                joinMediaSoupRoom(userName, roomId);
                toast.success('پیوستن به نشست');
            } catch (error) {
                toast.error('خطا هنگام پیوستن به نشست!')
            }
        }

        if (state.roomId && user?.email) {
            join(user.email, state.roomId);
        }
    }, [state.roomId]);

    const sendMessage = async (text: string) => {
        if (state.roomId) {
            socketSendMessage(text, userName, state.roomId);
        }
    }

    const joinRoom = async (roomId: string) => {
        dispatch({ type: ActionType.SET_ROOM_ID, payload: roomId });
    }

    const creatRoom = async (roomName: string) => {
        const roomId = await createMediaSoupRoom(roomName);
        return roomId || '';
    }

    const hangUp = async () => {
        return await closeClient(state.roomId, state.clientId);
    }

    const contextValue: MediaContextType = {
        rooms: state.rooms,
        messages: state.messages,
        mediaConsumers: state.mediaConsumers,
        userName,
        sendMessage,
        creatRoom,
        joinRoom,
        startPublish,
        audioChange,
        hangUp
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
        throw new Error('useMediaContext with in MediaProvider');
    }

    return context;
}