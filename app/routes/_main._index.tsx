import { useNavigate } from "react-router";
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
import { useMediaContext } from "~/components/MediaProvider";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "خانه" },
    { name: "description", content: "Video Conferencing App" },
  ];
}

export default function Home() {
  const { createRoom } = useMediaContext();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const roomName = formData.get("room") as string;
    const roomId = await createRoom(roomName);

    if(roomId){
      navigate(`/room/${roomId}`)
    }
  }

  return (
    <section className="grid items-center justify-center h-(--page--height)">
      <Card className=" w-96">
        <form onSubmit={handleSubmit} >
          <CardHeader className="mb-5">
            <CardTitle>ورود به نشست</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-5 grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="room">نام نشست</Label>
              <Input type="text" name="room" id="room" placeholder="نام نشست را وارد کنید" />
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" type="submit">ورود به نشست</Button>
          </CardFooter>
        </form>
      </Card>
    </section>
  )
}
