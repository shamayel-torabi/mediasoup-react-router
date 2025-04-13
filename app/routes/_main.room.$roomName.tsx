import { useUserContext } from "~/components/UserProvider";
import type { Route } from "./+types/_main.room.$roomName";

export async function loader({ params }: Route.LoaderArgs) {
  const roomName = params.roomName;
  return { roomName }
}

export default function Room({ loaderData }: Route.ComponentProps) {
  const { roomName } = loaderData;
  const { user } = useUserContext();
  const title = `ویدئو کنفرانس : ${user?.firstName} ${user?.lastName}`


  return (
    <section>
      <div className=" m-4 text-2xl text-gray-900 dark:text-white">نشست: {roomName} </div>
      <div className=" m-4 text-2xl text-gray-900 dark:text-white">{title}</div>
    </section>
  )
}
