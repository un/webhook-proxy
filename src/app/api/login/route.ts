import { github } from "~/server/auth";
import { cookies } from "next/headers";
import { generateState } from "arctic";
import { env } from "~/env";

export async function GET() {
  const state = generateState();
  const url = await github.createAuthorizationURL(state);

  cookies().set("github_oauth_state", state, {
    path: "/",
    secure: env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: "lax",
  });

  return Response.redirect(url);
}
