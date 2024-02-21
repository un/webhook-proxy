import type { inferAsyncReturnType } from "@trpc/server";
import type { H3Event } from "h3";
import { db } from "~/server/db";
import type { DatabaseUser } from "lucia";

//  * Creates context for an incoming request
//  * @link https://trpc.io/docs/context

export const createContext = async (event: H3Event) => {
  const user: DatabaseUser | null = (await event.context
    .user) as DatabaseUser | null;
  const org: OrgContext = await event.context.org;
  return { db, user, org, event };
};

export type Context = inferAsyncReturnType<typeof createContext>;
