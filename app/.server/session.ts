import { createCookieSessionStorage, redirect } from "react-router";

type SessionData = {
  userId: string;
};

type SessionFlashData = {
  error: string;
};

const { commitSession, destroySession, getSession } = createCookieSessionStorage<SessionData, SessionFlashData>({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: ["s3cret"],
    maxAge: 60 * 60 * 24,
    secure: process.env.NODE_ENV !== "development",
  },
});

const USER_SESSION_KEY = "userId";

const getUserSession = async (request: Request) => {
  return await getSession(request.headers.get("Cookie"));
};

export async function logout(request: Request) {
  //console.log("logout");
  const session = await getUserSession(request);
  return redirect("/", {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
}

export async function getUserId(request: Request) {
  const session = await getUserSession(request);
  const userId = session.get(USER_SESSION_KEY);
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
      "Set-Cookie": await commitSession(session, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: remember ? 60 * 60 * 24 : undefined,
        secure: process.env.NODE_ENV !== "development",
      }),
    },
  });
}
