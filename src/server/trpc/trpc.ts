import { TRPCError, initTRPC } from "@trpc/server";
import { validateRequest } from "../auth";
import { orgs } from "../db/schema";
import superjson from "superjson";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { z } from "zod";

export type Context = {
  db: typeof db;
};

export const trpcContext = initTRPC.context<Context>().create({ transformer: superjson });

const isUserAuthenticated = trpcContext.middleware(async ({ next, ctx }) => {
  const { user } = await validateRequest();
  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not logged in",
    });
  }
  return next({ ctx: { ...ctx, user } });
});

export const publicProcedure = trpcContext.procedure;
export const userProcedure = publicProcedure.use(isUserAuthenticated);
export const orgProcedure = userProcedure
  .input(z.object({ orgSlug: z.string().min(5).max(32) }))
  .use(async ({ input, ctx, next }) => {
    const org = await db.query.orgs.findFirst({
      where: eq(orgs.slug, input.orgSlug),
      columns: { name: true, slug: true, id: true },
      with: {
        members: {
          columns: {
            userId: true,
          },
        },
      },
    });
    if (!org) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No Organization found with provided slug",
      });
    }
    const hasMembership = org.members.some((member) => member.userId === ctx.user.id);
    if (!hasMembership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not a member of this organization",
      });
    }

    const { members, ...orgWithoutMembers } = org;

    return next({
      ctx: { ...ctx, org: orgWithoutMembers },
    });
  });

export const router = trpcContext.router;
export const createCallerFactory = trpcContext.createCallerFactory;
