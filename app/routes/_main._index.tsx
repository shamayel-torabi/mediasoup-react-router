import { Form, redirect } from "react-router";
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
      <Card className=" w-96">
        <Form method="post">
          <CardHeader className="mb-5">
            <CardTitle>ورود به نشست</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-5 grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="room">نام نشست</Label>
              <Input type="text" name="room" id="room" placeholder="نام نشست را وارد کنید"/>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" type="submit">ورود به نشست</Button>
          </CardFooter>
        </Form>
      </Card>
    </section>
  )
}
