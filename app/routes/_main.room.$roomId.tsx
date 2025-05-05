import Chat from "~/components/Chat";
import { useEffect, useRef, useState } from "react";
import { useMediaContext } from "~/components/MediaProvider";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import type { Route } from "./+types/_main.room.$roomId";
import { redirect } from "react-router";
import { Video, Pause, Play, MonitorPlay, Cable } from 'lucide-react';
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

  const updateRemoteVideos = async (newListOfActives: string[]) => {
    console.log("updateActiveSpeakers:", newListOfActives);

    const aid = activeSpeakers[0];
    const consumer = consumers[aid];
    if (remoteMedia.current) {
      remoteMedia.current.srcObject = consumer?.combinedStream;
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
  }

  const handleJoin = async () => {
    if (await joinRoom(roomId)) {
      setJoined(true);
    }
  }

  useEffect(() => {
    if (roomId)
      handleJoin()
  }, []);

  useEffect(() => {
    updateRemoteVideos(activeSpeakers);
  }, [consumers, activeSpeakers]);



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
    <div className="grid grid-cols-[1fr_20rem] min-w-5xl">
      <Card className="my-2 ms-2">
        <CardContent className="p-2 py-2 grid grid-cols-[1fr_16rem] gap-2" >
          <div className="grid grid-flow-row justify-items-center">
            <div className="w-full">
              <div className="grid grid-flow-row justify-items-center gap-0.5">
                <video ref={remoteMedia} className="aspect-video" autoPlay></video>
              </div>
            </div>
            <div className="grid items-center">
              <div className="space-x-1">
                {/* <Button variant="outline" disabled={joined} onClick={handleJoin}>
                  <Cable color="red" size={48} />
                </Button> */}
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
          <div className="grid justify-self-start items-start gap-2">
            <div className="h-32 grid grid-flow-row justify-items-center gap-1 border p-1">
              <video ref={localMedia} className="aspect-video" muted autoPlay></video>
              <p className="text-center">من</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Chat />
    </div>
  )
}
