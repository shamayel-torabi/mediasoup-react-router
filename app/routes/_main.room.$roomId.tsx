import Chat from "~/components/Chat";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMediaContext } from "~/components/MediaProvider";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import type { Route } from "./+types/_main.room.$roomId";
import { redirect } from "react-router";
import { Video, Pause, Play, MonitorPlay } from 'lucide-react';
import { toast } from "sonner";

export async function loader({ params }: Route.LoaderArgs) {
  //const searchParams = new URL(request.url).searchParams;
  const roomId = params.roomId;
  if (!roomId) {
    return redirect('/')
  }
  return { roomId }
}

export default function RoomPage({ loaderData }: Route.ComponentProps) {
  const { consumers, activeSpeakers, joinRoom, audioChange, startPublish } = useMediaContext();
  const [pause, setPause] = useState(true);
  const [joined, setJoined] = useState(false);
  const [published, setPublished] = useState(false);
  const localMedia = useRef<HTMLVideoElement>(null);
  const remoteMedia = useRef<HTMLVideoElement>(null);
  const roomId = loaderData.roomId;

  const updateRemoteVideos = useCallback(() => {
    console.log("activeSpeakers:", activeSpeakers);
    //console.log('consumers', consumers)

    //const aid = activeSpeakers[0];
    //console.log('aid:', aid)
    //const consumer = consumers[aid];

    //console.log('consumer', consumer)

    for (const [aid, consumer] of Object.entries(consumers)) {
      console.log('aid', aid),
        console.log('consumer:', consumer)
      if (remoteMedia.current && aid === activeSpeakers[0]) {
        remoteMedia.current.srcObject = consumer?.combinedStream;
      }
    }



    // for (let el of remoteVideos) {
    //   el.srcObject = null; //clear out the <video>
    // }

    // let slot = 0;
    // newListOfActives.forEach((aid) => {
    //   if (aid !== audioProducer?.id) {
    //     const consumer = consumers[aid];

    //     remoteVideos[slot].srcObject = consumer?.combinedStream;
    //     remoteUserNames[slot] = consumer?.userName;
    //     slot++; //for the next
    //   }
    // });
  }, [consumers, activeSpeakers])

  const handleJoin = useCallback(async () => {
    try {
      await joinRoom(roomId);
      setJoined(true);
    } catch (error) {
      toast.error('خطا هنگام پیوستن به نشست!')
    }
  }, [roomId])

  useEffect(() => {
    if (roomId)
      handleJoin()
  }, []);

  useEffect(() => {
    updateRemoteVideos();
  }, [consumers]);

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
          localStream =
            await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
        }

        if (localStream) {
          await startPublish(localStream);

          localMedia.current.srcObject = localStream;
          setPublished(true);
        }
      }
      catch (error) {
        toast('خطا هنگام ارسال رسانه')
      }
    }
  }

  const handleMute = () => {
    const result = audioChange();
    setPause(result)
  }

  return (
    <div className="grid grid-cols-[1fr_20rem] min-w-5xl gap-1 p-2">
      <Card className="p-0 h-(--page--height)">
        <CardContent className="grid grid-rows-[1fr_10rem] gap-1" >
          <div className="p-1 grid grid-rows-[1fr_3rem] items-center">
            <div className="mb-6 mx-auto h-(--video--height)">
              <div className=" text-center">Name</div>
              <video ref={remoteMedia} className="h-full aspect-video" autoPlay controls playsInline></video>
            </div>
            <div className="grid justify-center py-2">
              <div className="space-x-1">
                <Button variant="outline" disabled={!joined} onClick={() => handlePublish('camera')}>
                  <Video color="red" size={48} />
                </Button>
                <Button variant="outline" disabled={!joined} onClick={() => handlePublish("desktop")}>
                  <MonitorPlay color="red" size={48} />
                </Button>
                <Button variant="outline" disabled={!published} onClick={handleMute}>
                  {pause ? <Play color="black" size={48} /> : <Pause color="red" size={48} />}
                </Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2">
            <div className="bg-black dark:bg-gray-300 p-2">
              <video ref={localMedia} className="w-[16rem] aspect-video mx-auto" muted autoPlay controls playsInline></video>
              <p className="text-center text-gray-50 dark:text-gray-600">من</p>
            </div>
            <div className="bg-black dark:bg-gray-300 p-2">
              <video className="w-[16rem] aspect-video mx-auto" autoPlay controls playsInline></video>
              <p className="text-center text-gray-50 dark:text-gray-600"></p>
            </div>
            <div className="bg-black dark:bg-gray-300 p-2">
              <video className="w-[16rem] aspect-video mx-auto" autoPlay controls playsInline></video>
              <p className="text-center text-gray-50 dark:text-gray-600"></p>
            </div>
            <div className="bg-black dark:bg-gray-300 p-2">
              <video className="w-[16rem] aspect-video mx-auto" autoPlay controls playsInline></video>
              <p className="text-center text-gray-50 dark:text-gray-600"></p>
            </div>
            <div className="bg-black dark:bg-gray-300 p-2">
              <video className="w-[16rem] aspect-video mx-auto" autoPlay controls playsInline></video>
              <p className="text-center text-gray-50 dark:text-gray-600"></p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Chat />
    </div>
  )
}
