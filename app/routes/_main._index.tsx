import { Form, redirect } from "react-router";
import type { Route } from "./+types/_main._index";
import { Card } from "~/components/Card";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "خانه" },
    { name: "description", content: "Video Conferencing App" },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const roomName = formData.get("room") as string;
  
  if (roomName) {
    const encoded = encodeURIComponent(roomName)
    return redirect(`/room?roomName=${encoded}`)
  }
}

export default function Home() {
  return (
    <section className="grid items-center justify-center h-(--page--height)">
      <Card className="m-b-2 grid min-h-64 w-96">
        <p className="mb-5 text-2xl text-gray-900 dark:text-white">ورود به نشست</p>
        <Form method="post">
          <div className="mb-5">
            <label
              htmlFor="room"
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">نام نشست</label>
            <input
              type="text"
              id="room"
              name="room"
              className="shadow-xs bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 dark:shadow-xs-light"
              placeholder="نام نشست را وارد کنید" required />
          </div>
          <div className="flex flex-row-reverse">
            <button
              type="submit"
              className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
              ورود به نشست
            </button>
          </div>
        </Form>
      </Card>
    </section>
  )
}
