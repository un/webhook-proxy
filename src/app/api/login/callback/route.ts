import { orgMembers, orgs, users } from "~/server/db/schema";
import { typeIdGenerator } from "~/server/utils/typeid";
import { github, lucia } from "~/server/auth";
import { OAuth2RequestError } from "arctic";
import { cookies } from "next/headers";
import { db } from "~/server/db";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = cookies().get("github_oauth_state")?.value ?? null;

  if (!code || !state || !storedState || state !== storedState) {
    return new Response(null, {
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
    });
    if (existingUser) {
      const session = await lucia.createSession(existingUser.id, {});
      const sessionCookie = lucia.createSessionCookie(session.id);
      cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/${existingUser.username}/dashboard`,
        },
      });
    }

    const [user] = await db
      .insert(users)
      .values({
        githubId: githubUser.id,
        username: githubUser.login,
        publicId: typeIdGenerator("user"),
      })
      .returning();

    if (!user) {
      throw new Error("Failed to create user");
    }

    const [newOrg] = await db
      .insert(orgs)
      .values({
        name: `${user.username}'s Organization`,
        slug: user.username,
        publicId: typeIdGenerator("org"),
      })
      .returning();

    if (!newOrg) {
      throw new Error("Failed to create org");
    }

    await db.insert(orgMembers).values({
      orgId: newOrg.id,
      userId: user.id,
    });

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/${user.username}/dashboard`,
      },
    });
  } catch (e) {
    console.error(e);
    if (e instanceof OAuth2RequestError) {
      return new Response(null, {
        status: 400,
      });
    }
    return new Response(null, {
      status: 500,
    });
  }
}

interface GitHubUser {
  id: string;
  login: string;
}
