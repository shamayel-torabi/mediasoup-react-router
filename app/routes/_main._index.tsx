import { Link, redirect } from "react-router";
import type { Route } from "./+types/_main._index";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { v5 as uuidv5 } from 'uuid';
import { Errors } from "~/components/Errors";
import { useMediaContext } from "~/components/MediaProvider";
import React from "react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { DialogTrigger } from "@radix-ui/react-dialog";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "خانه" },
    { name: "description", content: "Video Conferencing App" },
  ];
}

// export async function action({ request }: Route.ActionArgs) {
//   const formData = await request.formData();
//   const roomName = formData.get("room") as string;

//   if (roomName) {
//     const roomId = uuidv5(roomName, UUIDV5_NAMESPACE);
//     return redirect(`/room/${roomId}`)
//   }
//   else {
//     return { error: "نام نشست باید وارد شود" }
//   }
// }



export default function Home({ actionData }: Route.ComponentProps) {
  const { creatRoom, rooms } = useMediaContext();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const roomName = formData.get("room") as string;
    if (roomName) {
      const rommId = await creatRoom(roomName);
      console.log('rommId:', rommId)
    }
  }
  return (
    <section className="grid items-center justify-center h-(--page--height)">
      <Card className=" w-96">
        <CardHeader>
          <CardTitle>ورود به نشست</CardTitle>
        </CardHeader>
        <CardContent className="grid">
          <p>فهرست نشست ها</p>
          <div>
            <ul>
              {
                rooms.map((room) => (
                  <li key={room.roomId}>
                    <Link to={`/room/${room.roomId}`}>
                      {room.roomName}
                    </Link>
                  </li>))
              }
            </ul>
          </div>
          <div className="mt-4" dir="ltr">
            <Dialog >
              <DialogTrigger asChild>
                <Button variant="outline">ایجاد نشست جدید</Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>ایجاد یک نشست جدید</DialogTitle>
                    <DialogDescription>
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mb-3 grid w-full items-center gap-2">
                    <Label htmlFor="room">نام نشست</Label>
                    <Input type="text" name="room" id="room" placeholder="نام نشست را وارد کنید" />
                    <Errors errors={[actionData?.error!]} />
                  </div>
                  {/* <div className="flex justify-end">
                    <Button variant="outline" type="submit">ایجاد</Button>
                  </div> */}
                  <DialogFooter className="justify-end">
                    <DialogClose asChild>
                      <Button type="submit" variant="outline">
                        ایجاد
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
        <CardFooter>
        </CardFooter>
      </Card>
    </section>
  )
}
