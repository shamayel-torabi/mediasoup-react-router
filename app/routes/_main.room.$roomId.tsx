import Chat from "~/components/Chat";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMediaContext } from "~/components/MediaProvider";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { redirect, useNavigate } from "react-router";
import { MonitorPlay, Video, DoorClosed, Mic, MicOff } from 'lucide-react';
import { toast } from "sonner";
import VideoBox from "~/components/VideoBox";
import type { Route } from "./+types/_main.room.$roomId";


export async function loader({ params }: Route.LoaderArgs) {
  //const searchParams = new URL(request.url).searchParams;
  const roomId = params.roomId;
  if (!roomId) {
    return redirect('/')
  }
  return { roomId }
}

export default function RoomPage({ loaderData }: Route.ComponentProps) {
  const {
    userName,
    mediaConsumers,
    joinRoom,
    audioChange,
    startPublish,
    hangUp
  } = useMediaContext();

  const roomId = loaderData.roomId;

  const [joined, setJoined] = useState(false);
  const [published, setPublished] = useState(false);
  const [pause, setPause] = useState(false);

  const navigate = useNavigate();

  const localMedia = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleJoin = async () => {
      try {
        await joinRoom(roomId);
        setJoined(true);
      } catch (error) {
        toast.error('خطا هنگام پیوستن به نشست!')
      }
    };

    if (roomId)
      handleJoin();

  }, [roomId]);

  const handlePublish = async (source: 'camera' | 'desktop') => {
    let localStream: MediaStream | null;
    if (localMedia.current) {
      try {
        if (source === 'camera') {
          localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
        }
        else {
          const displayMediaOptions = {
            video: {
              cursor: "always",
              height: 1000,
              width: 1200,
            },
            audio: true,
          };
          localStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
        }

        if (localStream) {
          await startPublish(localStream);

          localMedia.current.srcObject = localStream;
          setPublished(true);
        }
      }
      catch (error) {
        toast.error('خطا هنگام ارسال رسانه')
      }
    }
  }

  const handleMute = () => {
    const result = audioChange();
    setPause(result)
  }

  const handleExit = async () => {
    if (roomId) {
      const result = await hangUp();
      if (!result) {
        toast.error("خطا هنگام خروج از نشست!");
        return;
      }
      navigate('/')
    }
  }

  const renderMainVideo = useCallback(() => {
    const consumer = mediaConsumers[0];

    return (
      <VideoBox
        source={consumer?.mediaStream}
        userName={consumer?.userName}
        vidClass="h-full"
        divClass="mb-6 mx-auto h-(--video--height)"
        autoPlay controls playsInline />
    )
  }, [mediaConsumers]);

  const renderRemoteVideo = useCallback(() => {

    return mediaConsumers.map((consumer, index) => {
      if (index === 0)
        return null;

      return (
        <VideoBox
          key={index}
          source={consumer?.mediaStream}
          userName={consumer?.userName}
          vidClass="w-[16rem]"
          divClass="bg-black dark:bg-gray-300 p-2"
          autoPlay controls playsInline />
      )
    });

  }, [mediaConsumers]);

  return (
    <div className="grid grid-cols-[1fr_20rem] min-w-5xl gap-1 p-2">
      <Card className="p-0 h-(--page--height)">
        <CardContent className="grid grid-rows-[1fr_10rem] gap-1" >
          <div className="p-1 grid grid-rows-[1fr_3rem] items-center">
            {renderMainVideo()}
            <div className="grid justify-center py-2">
              <div className="space-x-1">
                <Button variant="outline" disabled={!joined} onClick={() => handlePublish('camera')} title="دوربین">
                  {joined ? <Video color="red" size={48} /> : <Video color="black" size={48} />}
                </Button>
                <Button variant="outline" disabled={!joined} onClick={() => handlePublish("desktop")} title="صفحه نمایش">
                  {joined ? <MonitorPlay color="red" size={48} /> : <MonitorPlay color="black" size={48} />}
                </Button>
                <Button variant="outline" disabled={!published} onClick={handleMute} title={pause ? "میکروفون روشن": "میکروفون خاموش"}>
                  {pause ?  <Mic color="red" size={48} /> : <MicOff color="red" size={48} /> }
                </Button>
                <Button variant="outline" disabled={!published} onClick={handleExit} title="خروج">
                  <DoorClosed color="red" size={48} />
                </Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2">
            <div className="bg-black dark:bg-gray-300 p-2">
              <video ref={localMedia} className="w-[16rem] aspect-video mx-auto" muted autoPlay controls playsInline></video>
              <p className="text-center text-gray-50 dark:text-gray-600">{userName}</p>
            </div>
            {renderRemoteVideo()}
          </div>
        </CardContent>
      </Card>
      <Chat />
    </div>
  )
}
