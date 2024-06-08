import type { Session, User } from "lucia";
import type { users } from "../db/schema";
import { cookies } from "next/headers";
import { adapter } from "./adapter";
import { GitHub } from "arctic";
import { Lucia } from "lucia";
import { cache } from "react";
import { env } from "~/env";

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    expires: false,
    attributes: {
      secure: env.NODE_ENV === "production",
    },
  },
  getUserAttributes: ({ githubId, username }) => ({ githubId, username }),
});

export const github = new GitHub(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET);

export const validateRequest = cache(
  async (): Promise<{ user: User; session: Session } | { user: null; session: null }> => {
    const sessionId = cookies().get(lucia.sessionCookieName)?.value ?? null;
    if (!sessionId) {
      return {
        user: null,
        session: null,
      };
    }

    const result = await lucia.validateSession(sessionId);
    // next.js throws when you attempt to set cookie when rendering page
    try {
      if (result.session && result.session.fresh) {
        const sessionCookie = lucia.createSessionCookie(result.session.id);
        cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
      }
      if (!result.session) {
        const sessionCookie = lucia.createBlankSessionCookie();
        cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
      }
    } catch {}
    return result;
  },
);

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    UserId: number;
    DatabaseUserAttributes: typeof users.$inferSelect;
  }
}
