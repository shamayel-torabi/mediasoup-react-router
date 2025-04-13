import { Outlet } from "react-router";

export default function AuthLayout() {
    return (
        <main className="overflow-y-auto">
            <Outlet />
        </main>
    );
}