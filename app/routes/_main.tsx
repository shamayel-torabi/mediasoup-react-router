import { Outlet } from "react-router";
import Header from "~/components/Header";
import type { Route } from "./+types/_main";
import { getUserId } from "~/.server/session";

export async function loader({ request }: Route.LoaderArgs) {
    // Check if the user is already logged in
    const userId = await getUserId(request);
    return { userId }
}

export default function RootLayout({ loaderData }: Route.ComponentProps) {
    const { userId } = loaderData;
    return (
        <>
            <Header userId={userId} />
            <main className="overflow-y-auto">
                <Outlet />
            </main>
        </>
    );
}