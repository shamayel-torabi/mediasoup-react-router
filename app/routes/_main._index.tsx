import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { useMediaContext } from "~/components/MediaProvider";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "~/components/ui/alert-dialog";
import type { Route } from "./+types/_main._index";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "خانه" },
    { name: "description", content: "Video Conferencing App" },
  ];
}

export default function Home() {
  const { creatRoom, rooms } = useMediaContext();
  const [open, setOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const roomName = formData.get("room") as string;
    if (roomName) {
      await creatRoom(roomName);
    }
  }

  return (
    <section className="grid items-center justify-center h-(--page--height)">
      <Card className="w-96">
        <CardHeader>
          <p className="text-lg text-gray-950 dark:text-gray-50">فهرست نشست ها</p>
        </CardHeader>
        <CardContent className="grid">
          <ul>
            {
              rooms.map((room) => (
                <li key={room.roomId} className="p-1 hover:bg-blue-600">
                  <Link to={`/room/${room.roomId}`} className="text-md text-gray-950 dark:text-gray-50 hover:text-white">
                    {room.roomName}
                  </Link>
                </li>))
            }
          </ul>
        </CardContent>
        <CardFooter className="flex justify-end-safe">
          <Button variant="outline" onClick={e => setOpen(true)}>ایجاد نشست جدید</Button>
        </CardFooter>
      </Card>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="w-96">
          <form onSubmit={handleSubmit}>
            <AlertDialogHeader className="mb-4">
              <AlertDialogTitle>ایجاد یک نشست جدید</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="mb-3 grid w-full items-center gap-2">
              <Label htmlFor="room">نام نشست</Label>
              <Input type="text" name="room" id="room" placeholder="نام نشست را وارد کنید" />
            </div>
            <AlertDialogFooter className="justify-end">
              <AlertDialogCancel>انصراف</AlertDialogCancel>
              <AlertDialogAction type="submit">ایجاد</AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
