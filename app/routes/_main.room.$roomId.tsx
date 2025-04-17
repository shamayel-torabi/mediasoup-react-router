import Chat from "~/components/Chat";
import { useRef } from "react";
import { useMediaContext } from "~/components/MediaProvider";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import type { Route } from "./+types/_main.room.$roomId";
import { redirect, useNavigate } from "react-router";
import { toast } from "sonner";

export async function loader({ params }: Route.LoaderArgs) {
  //const searchParams = new URL(request.url).searchParams;
  const roomId = params.roomId;
  if (!roomId) {
    return redirect('/')
  }
  return { roomId }
}

export default function Room({ loaderData }: Route.ComponentProps) {
  const { roomId } = loaderData;
  const { joinRoom, muteAudio, startPublish } = useMediaContext();
  const localMediaLeft = useRef<HTMLVideoElement | undefined>(undefined);
  const navigate = useNavigate();

  const handleJoin = async () => {
    const result = await joinRoom(roomId);
    if (!result) {
      navigate('/')
    }

    toast('پیوستن به نشست')
  }

  const handlePublish = async () => {
    if (localMediaLeft.current) {
      await startPublish(localMediaLeft.current)
    }
  }

  const handleMute = async () => {
    const result = await muteAudio();
  }

  return (
    <div className="flex">
      <Card className="flex-1 my-2 ms-2">
        <CardContent>
          <div>
            <div className="grid grid-flow-col justify-items-center">
              <div className="space-x-1">
                <Button variant="outline" onClick={handleJoin}>پیوستن به نشست</Button>
                <Button variant="outline" onClick={handlePublish}>ارسال تصویر</Button>
                <Button variant="outline" onClick={handleMute}>Mute</Button>
              </div>
            </div>
            <div className="my-2 grid grid-flow-col justify-items-center">
              <div className="remote-video-container remote-speaker">
                <video id="remote-video-1" className="w-32 h-full" autoPlay controls></video>
                <div id="username-1"></div>
              </div>
              <div className="remote-video-container" >
                <video id="remote-video-2" className="w-32 h-full remote-video" autoPlay controls></video>
                <div id="username-2"></div>
              </div>
              <div className="remote-video-container" >
                <video id="remote-video-3" className="w-32 h-full remote-video" autoPlay controls></video>
                <div id="username-3" className="username"></div>
              </div>
              <div className="remote-video-container">
                <video id="remote-video-4" className="w-32 h-full remote-video" autoPlay controls></video>
                <div id="username-4" className="username"></div>
              </div>
            </div>
            <div className="my-3 grid grid-cols-[8fr_2fr] gap-1">
              <div className="w-full">
                <div id="current-speaker" className="mb-3">
                  <div className="current-video-container">
                    <video id="remote-video-0" className="w-full h-full" autoPlay controls></video>
                    <div id="username-0" className="username"></div>
                  </div>
                </div>
              </div>
              <div >
                <div id="local-media" className="position-relative" style={{ height: "150px" }}>
                  <div className="position-absolute">
                    <video ref={localMediaLeft} className="border border-primary" muted autoPlay></video>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Chat />
    </div>
  )
}
