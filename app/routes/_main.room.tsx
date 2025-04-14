import Chat from "~/components/Chat";
import type { Route } from "./+types/_main.room";
import { useState } from "react";
import { useMediaContext } from "~/components/MediaProvider";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

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
        <Button variant="outline" onClick={handleJoin}>پیوستن به نشست</Button>
      </div>)
  }

  return (
    <div className="flex">
      <Card className="flex-1 my-2 ms-2">
        <CardContent>
          <h1 className="text-gray-900 dark:text-gray-50">Test</h1>
        </CardContent>
      </Card>
      <Chat />
    </div>
  )
}
