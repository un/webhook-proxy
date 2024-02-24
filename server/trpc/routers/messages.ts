import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { limitedProcedure, router, userProcedure, orgProcedure } from "../trpc";
import { endpoints, messages } from "~/server/db/schema";
import { and, desc, eq } from "drizzle-orm";

export const messageRouter = router({
  getEndpointMessages: orgProcedure
    .input(
      z
        .object({
          endpointId: z.string(),
        })
        .strict()
    )
    .query(async ({ ctx, input }) => {
      const { db, user, org } = ctx;

      const messagesResponse = await db.query.messages.findMany({
        where: and(
          eq(messages.endpointId, input.endpointId),
          eq(messages.orgId, org.id)
        ),
        columns: {
          id: true,
          endpointId: true,
          headers: true,
          origin: true,
          body: true,
          response: true,
          createdAt: true,
        },
        orderBy: [desc(messages.createdAt)],
      });

      return messagesResponse;
    }),
  getEndpoint: orgProcedure
    .input(z.object({ id: z.string() }).strict())
    .query(async ({ ctx, input }) => {
      const { db, user, org } = ctx;

      const endpointResponse = await db.query.endpoints.findFirst({
        where: eq(endpoints.id, input.id),
        columns: {
          id: true,
          name: true,
          createdAt: true,
          response: true,
          routingStrategy: true,
        },
        with: {
          destinations: {
            columns: {
              enabled: true,
              order: true,
            },
            with: {
              destination: {
                columns: {
                  id: true,
                  name: true,
                  url: true,
                  headers: true,
                },
              },
            },
          },
        },
      });

      return endpointResponse;
    }),
  renameEndpoint: orgProcedure
    .input(
      z
        .object({
          id: z.string(),
          name: z.string().min(3).max(64),
        })
        .strict()
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user, org } = ctx;

      await db
        .update(endpoints)
        .set({
          name: input.name,
        })
        .where(eq(endpoints.id, input.id));

      return;
    }),
});
