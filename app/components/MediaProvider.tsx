import {
    createContext,
    useContext,
    useState
} from 'react'

import { Device } from 'mediasoup-client/types';
import type { MediaConsumer, Message } from '~/types';
import { useUserContext } from './UserProvider';
import { toast } from 'sonner';
import { useSocket } from '~/hooks/useSocket';

type MediaContextType = {
    messages: Message[],
    sendMessage: (text: string) => Promise<void>,
    joinRoom: (roomId: string) => Promise<void>
}

const MediaContext = createContext<MediaContextType>({} as MediaContextType)

export default function MediaProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const { messages, socketSendMessage, join, requestTransport, requestTransportToConsume} = useSocket();
    const [roomId, setRoomId] = useState<string>('');
    const [device, setDevice] = useState<Device>();
    const [consumers, setConsumers] = useState<Record<string, MediaConsumer>>({})
    const { user } = useUserContext();

    


    const sendMessage = async (text: string) => {
        if (roomId) {
            const userName = `${user?.firstName} ${user?.lastName}`;
            socketSendMessage(text, userName, roomId);
        }
    }

    const joinRoom = async (room: string) => {
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

        const requestTransportResp = await requestTransport('producer');
        //console.log('requestTransportResp:', requestTransportResp)
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