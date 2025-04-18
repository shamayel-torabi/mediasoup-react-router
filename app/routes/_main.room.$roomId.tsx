import Chat from "~/components/Chat";
import { useEffect, useRef, useState } from "react";
import { useMediaContext } from "~/components/MediaProvider";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import type { Route } from "./+types/_main.room.$roomId";
import { redirect } from "react-router";

export async function loader({ params }: Route.LoaderArgs) {
  //const searchParams = new URL(request.url).searchParams;
  const roomId = params.roomId;
  if (!roomId) {
    return redirect('/')
  }
  return { roomId }
}

const RemoteVideoPane = ({ combinedStream, userName, className }:
  { combinedStream: MediaStream, userName: string, className: string }
) => {
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (video.current) {
      video.current.srcObject = combinedStream;
    }

  }, [])
  return (
    <div className="grid grid-flow-row justify-items-center gap-1">
      <video ref={video} className={className} autoPlay controls></video>
      <p className="text-center">{userName}</p>
    </div>
  )
}

export default function RoomPage({ loaderData }: Route.ComponentProps) {
  const { roomId } = loaderData;
  const { consumers, listOfActives, joinRoom, audioChange, startPublish } = useMediaContext();
  const localMediaLeft = useRef<HTMLVideoElement | null>(null);
  const [joined, setJoined] = useState(false);
  const [published, setPublished] = useState(false);

  const handleJoin = async () => {
    if (await joinRoom(roomId)) {
      setJoined(true);
    }
  }

  const handlePublish = async () => {
    if (localMediaLeft.current) {
      const localStream = await startPublish();
      if (localStream) {
        localMediaLeft.current.srcObject = localStream;
        setPublished(true);
      }
    }
  }

  const handleMute = () => {
    const result = audioChange();
  }

  const firstVideoRender = () => {
    const aid = listOfActives[0]
    const consumerForThisSlot = consumers[aid];

    return (
      <RemoteVideoPane
        className="w-full aspect-video"
        combinedStream={consumerForThisSlot?.combinedStream}
        userName={consumerForThisSlot?.userName} />
    )
  }

  const videoRender = () => {
    return listOfActives.map((aid, index) => {
      if (index == 0) {
        return null;
      }
      const consumerForThisSlot = consumers[aid];

      return (
        <RemoteVideoPane
          key={index}
          className="w-64 aspect-video border border-primary p-1"
          combinedStream={consumerForThisSlot?.combinedStream}
          userName={consumerForThisSlot?.userName} />
      )
    })
  }

  return (
    <div className="grid grid-cols-[1fr_20rem] min-w-5xl">
      <Card className="flex-1 my-2 ms-2 p-2 overflow-auto">
        <CardContent >
          <div className="grid grid-flow-col justify-items-center mb-1">
            <div className="space-x-1">
              <Button variant="outline" disabled={published} onClick={handleJoin}>پیوستن به نشست</Button>
              <Button variant="outline" disabled={!joined} onClick={handlePublish}>ارسال تصویر</Button>
              <Button variant="outline" disabled={!published} onClick={handleMute}>Mute</Button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-[1fr_16rem] gap-1">
            <div className="w-full">
              {firstVideoRender()}
            </div>
            <div className="grid grid-flow-row justify-items-start gap-2">
              <div className="grid grid-flow-row justify-items-center gap-1">
                <video ref={localMediaLeft} className="w-64 aspect-video border border-primary p-1" muted autoPlay></video>
                <p className="text-center">من</p>
              </div>
              {videoRender()}
            </div>
          </div>
        </CardContent>
      </Card>
      <Chat />
    </div>
  )
}
