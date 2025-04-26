import Chat from "~/components/Chat";
import { useEffect, useRef, useState } from "react";
import { useMediaContext } from "~/components/MediaProvider";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import type { Route } from "./+types/_main.room.$roomId";
import { redirect } from "react-router";
import { Video, Pause, Play } from 'lucide-react';
import { RemoteVideoPane } from "~/components/RemoteVideoPane";

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
  const localMediaLeft = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const [roomId, setRoomId] = useState(()=> loaderData.roomId)

  useEffect(() => {
    const join = async () => {
      if (await joinRoom(roomId)) {
        setJoined(true);
      }
    }
    join();
  }, [])

  useEffect(() => {
    const aid = activeSpeakers[0];
    if (aid) {
      const consumerForThisSlot = consumers[aid];
      if (remoteVideo.current) {
        remoteVideo.current.srcObject = consumerForThisSlot?.combinedStream
      }
    }

  }, [activeSpeakers])

  const handlePublish = async () => {
    if (localMediaLeft.current) {
      const localStream = await startPublish();
      if (localStream) {
        localMediaLeft.current.srcObject = localStream;
        setPublished(true);
      }
      else{

      }
    }
  }

  const handleMute = () => {
    const result = audioChange();
    setPause(result)
  }



  const videoRender = () => {
    //console.log('videoRender listOfActives: ', listOfActives);

    return activeSpeakers.map((aid, index) => {
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
              <div className="grid grid-flow-row justify-items-center gap-0.5">
                <video ref={remoteVideo} className="w-full aspect-video" autoPlay controls playsInline></video>
                <p className="text-center"></p>
              </div>
            </div>
            <div className="grid items-center">
              <div className="space-x-1">
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
