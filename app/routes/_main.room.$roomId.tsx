import Chat from "~/components/Chat";
import { useState } from "react";
import { useMediaContext } from "~/components/MediaProvider";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import type { Route } from "./+types/_main.room.$roomId";

export async function loader({ params }: Route.LoaderArgs) {
  //const searchParams = new URL(request.url).searchParams;
  const roomId = params.roomId;
  return { roomId }
}

export default function Room({ loaderData }: Route.ComponentProps) {
  const { roomId } = loaderData;
  const { joinRoom } = useMediaContext()

  const [join, setJoin] = useState(false);

  if (!roomId) {
    throw new Error("نام نشست باید وجود داشته باشد")
  }

  const handleJoin = async () => {
    await joinRoom(roomId);
    setJoin(true);
  }

  if (!join) {

    return (
      <div className="grid items-center justify-center h-(--page--height)">
        <Button variant="outline" onClick={handleJoin}>پیوستن به نشست</Button>
      </div>)
  }

  const style = {
    width: "18%",
    height: "80px"
  }

  return (
    <div className="flex">
      <Card className="flex-1 my-2 ms-2">
        <CardContent>
          <div>
            <div id="remote-media" className="grid grid-cols-4" >
              <div className="remote-video-container remote-speaker">
                <video id="remote-video-1" className="w-32 h-full" autoPlay controls></video>
                <div id="username-1"></div>
              </div>
              <div className="remote-video-container" style={style}>
                <video id="remote-video-2" className="w-32 h-full remote-video" autoPlay controls></video>
                <div id="username-2"></div>
              </div>
              <div className="remote-video-container" style={style}>
                <video id="remote-video-3" className="w-32 h-full remote-video" autoPlay controls></video>
                <div id="username-3" className="username"></div>
              </div>
              <div className="remote-video-container" style={style}>
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
                    <video id="local-video-left" className="border border-primary" muted autoPlay></video>
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
