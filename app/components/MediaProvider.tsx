import {
    createContext,
    useContext,
    useEffect,
    useReducer,
} from 'react'

import { type ConsumerType, type MediaConsumer, type Message, type RoomType } from '~/types';
import { useUserContext } from './UserProvider';
import { toast } from 'sonner';
import { useMediasoup } from '~/hooks/useMediasoup';


type MediaContextType = {
    messages: Message[];
    rooms: RoomType[];
    activeSpeakers: string[];
    consumers: Record<string, MediaConsumer>;
    userName: string;
    creatRoom: (roomName: string) => Promise<string>;
    sendMessage: (text: string) => Promise<void>;
    joinRoom: (roomId: string) => Promise<void>;
    startPublish: (localStream: MediaStream) => Promise<void>;
    audioChange: () => boolean;
}

const MediaContext = createContext<MediaContextType>({} as MediaContextType)

export enum ActionType {
    SET_MESSAGES = 'SET_MESSAGES',
    ADD_MESSAGE = 'ADD_MESSAGE',
    SET_ROOMS = 'SET_ROOMS',
    SET_ROOM_ID = 'SET_ROOM_ID',
    ADD_ROOM = 'ADD_ROOM',
    SET_ACTIVE_SPEAKERS = 'SET_ACTIVE_SPEAKERS',
    SET_CONSUMER = 'SET_CONSUMER'
}
export type Action = {
    type: ActionType;
    payload: any;
}

type MediaState = {
    roomId: string;
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
        case ActionType.SET_ROOM_ID:
            return { ...state, roomId: payload };
        case ActionType.ADD_ROOM:
            return { ...state, rooms: [...state.rooms, payload] };
        case ActionType.SET_ACTIVE_SPEAKERS:
            return { ...state, activeSpeakers: payload };
        case ActionType.SET_CONSUMER:
            return { ...state, consumers: { ...state.consumers, ...payload } };
        default:
            return state;
    }
}

const initState: MediaState = {
    roomId: '',
    messages: [],
    rooms: [],
    activeSpeakers: [],
    consumers: {},
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
        audioChange
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

    const contextValue: MediaContextType = {
        ...state,
        userName,
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