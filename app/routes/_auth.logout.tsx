import type { Route } from "./+types/_auth.logout";
import { redirect } from "react-router";
import { logout } from "~/.server/session";

export async function loader({ request }: Route.LoaderArgs) {
  return redirect("/login");
}

export async function action({ request }: Route.ActionArgs) {
  return logout(request);
}

