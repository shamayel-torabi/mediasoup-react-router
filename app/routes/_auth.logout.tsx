import { redirect } from "react-router";
import { logout } from "~/.server/session";
import type { Route } from "./+types/_auth.logout";


export async function action({ request }: Route.ActionArgs) {
  return logout(request);
}

export async function loader({ request }: Route.LoaderArgs) {
  return redirect("/login");
}