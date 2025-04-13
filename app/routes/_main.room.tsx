import type { Route } from "./+types/_main.room";
import Chat from "~/components/Chat";
import { useState } from "react";
import { Button } from "~/components/Button";
import { useMediaContext } from "~/components/MediaProvider";
import { Card } from "~/components/Card";

export async function loader({ request }: Route.LoaderArgs) {
  const searchParams = new URL(request.url).searchParams;
  const roomName = searchParams.get("roomName");
  return { roomName }
}

export default function Room({ loaderData }: Route.ComponentProps) {
  const { roomName } = loaderData;
  const { joinRoom } = useMediaContext()

  const [join, setJoin] = useState(false);

  if (!roomName) {
    throw new Error("نام نشست باید وجود داشته باشد")
  }

  const handleJoin = async () => {
    await joinRoom(roomName);
    setJoin(true);
  }

  if (!join) {

    return (
      <div className="grid items-center justify-center h-(--page--height)">
        <Button onClick={handleJoin}>پیوستن به نشست</Button>
      </div>)
  }

  return (
    <div className="grid grid-cols-[240px_minmax(900px,_1fr)] gap-1">
      <Chat />
      <Card>
        <h1 className="text-gray-900 dark:text-gray-50">Test</h1>
      </Card>
    </div>
  )
}
