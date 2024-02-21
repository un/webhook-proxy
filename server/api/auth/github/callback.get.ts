import { OAuth2RequestError } from "arctic";
import { db } from "~/server/db";
import { orgMembers, orgs, users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { github, lucia } from "~/server/utils/auth";

export default eventHandler(async (event) => {
  console.log(" 🔥 hit the github callback url");
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
    console.log(" 🔥 existingUser", { existingUser });

    if (existingUser) {
      const session = await lucia.createSession(existingUser.id, {});
      const cookie = lucia.createSessionCookie(session.id);
      setCookie(event, cookie.name, cookie.value, cookie.attributes);
      console.log(
        " 🔥 redirecting to",
        `/o/${existingUser.username.toLocaleLowerCase()}`
      );
      return await sendRedirect(
        event,
        `/o/${existingUser.username.toLocaleLowerCase()}`
      );
    }

    const newUser = await db
      .insert(users)
      .values({ username: githubUser.login, githubId: githubUser.id })
      .returning();

    const newOrg = await db
      .insert(orgs)
      .values({
        name: githubUser.login,
        slug: githubUser.login.toLowerCase(),
      })
      .returning();

    await db.insert(orgMembers).values({
      orgId: newOrg[0].id,
      userId: newUser[0].id,
    });

    const session = await lucia.createSession(newUser[0].id, {});
    const cookie = lucia.createSessionCookie(session.id);
    setCookie(event, cookie.name, cookie.value, cookie.attributes);
    return await sendRedirect(event, `/o/${githubUser.login.toLowerCase()}`);
  } catch (e) {
    console.error(" 🔥 error", e);
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
