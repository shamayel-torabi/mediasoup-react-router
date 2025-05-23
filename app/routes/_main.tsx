import { Outlet, redirect } from "react-router";
import Header from "~/components/Header";
import type { Route } from "./+types/_main";
import { getUserId } from "~/.server/session";
import type { User } from "~/types";
import MediaProvider from "~/components/MediaProvider";
import UserProvider from "~/components/UserProvider";
import { getUserByEmail } from "~/.server/user";

export async function loader({ request }: Route.LoaderArgs) {
  // Check if the user is already logged in
  const userId = await getUserId(request);
  if (!userId) {
    throw redirect("/login");
  } else {
    const user = await getUserByEmail(userId);
    let u: User | undefined = undefined;
    if (user) {
      u = {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        image: user.image,
        createdAt: user.createdAt,
      };

      return { user: u };
    }
    else{
      throw redirect("/login");
    }
  }
}

export default function MainLayout({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  return (
    <UserProvider user={user}>
      <MediaProvider>
        <Header />
        <main className="overflow-y-auto">
          <Outlet />
        </main>
      </MediaProvider>
      </UserProvider>
  );
}