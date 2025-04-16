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
          <h1 className="text-gray-900 dark:text-gray-50">Test</h1>
          <div className="row my-3">
            <div id="remote-media" className="col mt-3 d-flex justify-content-between mb-3 gap-1" >
              <div className="remote-video-container border border-primary remote-speaker">
                <video id="remote-video-1" className="w-100 h-100 remote-video" autoPlay controls></video>
                <div id="username-1" className="username"></div>
              </div>
              <div className="remote-video-container border border-primary" style={style}>
                <video id="remote-video-2" className="w-100 h-100 remote-video" autoPlay controls></video>
                <div id="username-2" className="username"></div>
              </div>
              <div className="remote-video-container border border-primary" style={style}>
                <video id="remote-video-3" className="w-100 h-100 remote-video" autoPlay controls></video>
                <div id="username-3" className="username"></div>
              </div>
              <div className="remote-video-container border border-primary" style={style}>
                <video id="remote-video-4" className="w-100 h-100 remote-video" autoPlay controls></video>
                <div id="username-4" className="username"></div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-10">
              <div id="current-speaker" className="mb-3" style={{ textAlign: 'center' }}>
                <div className="current-video-container" style={{ width: "80%", height: "400px", margin: "0 auto" }}>
                  <video id="remote-video-0" className="w-100 h-100 border border-primary remote-video" autoPlay controls></video>
                  <div id="username-0" className="username"></div>
                </div>
              </div>
            </div>
            <div className="col-2">
              <div id="local-media" className="position-relative" style={{ height: "150px" }}>
                <div className="position-absolute">
                  <video id="local-video-left" className="border border-primary" muted autoPlay></video>
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
