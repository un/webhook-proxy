import { OAuth2RequestError } from "arctic";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const code = query.code?.toString() ?? null;
  const state = query.state?.toString() ?? null;
  const storedState = getCookie(event, "github_oauth_state") ?? null;
  if (!code || !state || !storedState || state !== storedState) {
    throw createError({
      status: 400,
    });
  }

  try {
    const tokens = await github.validateAuthorizationCode(code);
    const githubUserResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });
    const githubUser: GitHubUser = await githubUserResponse.json();
    const existingUser = await db.query.users.findFirst({
      where: eq(users.githubId, githubUser.id),
      columns: {
        id: true,
        username: true,
        githubId: true,
      },
    });

    if (existingUser) {
      const session = await lucia.createSession(existingUser.id, {});
      appendHeader(
        event,
        "Set-Cookie",
        lucia.createSessionCookie(session.id).serialize()
      );
      return sendRedirect(event, "/dashboard");
    }

    const newUser = await db
      .insert(users)
      .values({ username: githubUser.login, githubId: githubUser.id })
      .returning();

    const session = await lucia.createSession(newUser[0].id, {});
    appendHeader(
      event,
      "Set-Cookie",
      lucia.createSessionCookie(session.id).serialize()
    );
    return sendRedirect(event, "/dashboard");
  } catch (e) {
    if (
      e instanceof OAuth2RequestError &&
      e.message === "bad_verification_code"
    ) {
      // invalid code
      throw createError({
        status: 400,
      });
    }
    throw createError({
      status: 500,
    });
  }
});

interface GitHubUser {
  id: string;
  login: string;
}
