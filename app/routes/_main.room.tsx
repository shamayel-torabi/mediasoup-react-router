import { useUserContext } from "~/components/UserProvider";
import type { Route } from "./+types/_main.room.$roomName";

export async function loader({ request }: Route.LoaderArgs) {
  const searchParams = new URL(request.url).searchParams;

  const roomName = searchParams.get("roomName");
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
