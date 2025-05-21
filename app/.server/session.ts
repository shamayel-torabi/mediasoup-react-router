import { createCookieSessionStorage, redirect } from "react-router";
import type { User } from "~/types";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    secrets: ["s3cret"],
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  },
});

export const { commitSession, destroySession } = sessionStorage;

const getUserSession = async (request: Request) => {
  return await sessionStorage.getSession(request.headers.get("Cookie"));
};

export async function logout(request: Request) {
  //console.log("logout");
  const session = await getUserSession(request);
  return redirect("/", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}

const USER_SESSION_KEY = "userId";

export async function getUserId(request: Request): Promise<User["id"] | undefined> {
  const session = await getUserSession(request);
  const userId = session.get(USER_SESSION_KEY) as string;
  return userId;
}

export async function createUserSession({
  request,
  userId,
  remember = true,
  redirectUrl,
}: {
  request: Request;
  userId: string;
  remember: boolean;
  redirectUrl?: string;
}) {
  const session = await getUserSession(request);
  session.set(USER_SESSION_KEY, userId);
  return redirect(redirectUrl || "/", {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: remember
          ? 60 * 60 * 24 * 7 // 7 days
          : undefined,
      }),
    },
  });
}
