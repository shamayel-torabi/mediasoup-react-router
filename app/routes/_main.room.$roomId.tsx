import Chat from "~/components/Chat";
import { useEffect, useRef, useState } from "react";
import { useMediaContext } from "~/components/MediaProvider";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import type { Route } from "./+types/_main.room.$roomId";
import { redirect } from "react-router";
import { Video, Pause, Play, PlugZap } from 'lucide-react';

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

  }, []);

  return (
    <div className="grid grid-flow-row justify-items-center gap-0.5">
      <video ref={video} className={className} autoPlay controls></video>
      <p className="text-center">{userName}</p>
    </div>
  )
}

export default function RoomPage({ loaderData }: Route.ComponentProps) {
  const { roomId } = loaderData;
  const { consumers, listOfActives, joinRoom, audioChange, startPublish } = useMediaContext();
  const localMediaLeft = useRef<HTMLVideoElement | null>(null);
  const [pause, setPause] = useState(true);
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
    setPause(result)
  }

  const firstVideoRender = () => {
    const aid = listOfActives[0];
    const consumerForThisSlot = consumers[aid];

    //console.log('firstVideoRender aid: ', aid)

    return (
      <div className="w-full border p-1">
        <RemoteVideoPane
          className="w-full aspect-video"
          combinedStream={consumerForThisSlot?.combinedStream}
          userName={consumerForThisSlot?.userName} />
      </div>
    )
  }

  const videoRender = () => {
    //console.log('videoRender listOfActives: ', listOfActives);

    return listOfActives.map((aid, index) => {
      const consumerForThisSlot = consumers[aid];

      if (index == 0) {
        return null;
      }

      return (
        <div key={index} className="h-32 border p-1">
          <RemoteVideoPane
            className="h-full aspect-video"
            combinedStream={consumerForThisSlot?.combinedStream}
            userName={consumerForThisSlot?.userName} />
        </div>
      )
    })
  }

  return (
    <div className="grid grid-cols-[1fr_20rem] min-w-5xl">
      <Card className="my-2 ms-2">
        <CardContent className="p-2 py-2 grid grid-cols-[1fr_16rem] gap-2" >
          <div className="grid grid-flow-row justify-items-center">
            <div className="w-full">
              {firstVideoRender()}
            </div>
            <div className="grid items-center">
              <div className="space-x-1">
                <Button variant="outline" disabled={published} onClick={handleJoin}>
                  <PlugZap color="black" size={48} />
                </Button>
                <Button variant="outline" disabled={!joined} onClick={handlePublish}>
                  <Video color="red" size={48} />
                </Button>
                <Button variant="outline" disabled={!published} onClick={handleMute}>
                  {pause ? <Play color="black" size={48} /> : <Pause color="red" size={48} />}
                </Button>
              </div>
            </div>
          </div>
          <div className="grid justify-self-start items-start gap-2">
            <div className="h-32 grid grid-flow-row justify-items-center gap-1 border p-1">
              <video ref={localMediaLeft} className="aspect-video" muted autoPlay></video>
              <p className="text-center">من</p>
            </div>
            {videoRender()}
          </div>
        </CardContent>
      </Card>
      <Chat />
    </div>
  )
}
