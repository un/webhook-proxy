import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { limitedProcedure, router, userProcedure, orgProcedure } from "../trpc";
import { endpoints, messageDeliveries, messages } from "~/server/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { sendMessageToDestinations } from "~/server/utils/destinationSender";

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
          bodyJson: true,
          response: true,
          createdAt: true,
          contentType: true,
          method: true,
          path: true,
        },
        orderBy: [desc(messages.createdAt)],
      });

      return messagesResponse;
    }),

  getMessagesDeliveries: orgProcedure
    .input(
      z
        .object({
          messageId: z.string(),
        })
        .strict()
    )
    .query(async ({ ctx, input }) => {
      const { db, user, org } = ctx;

      const deliveriesResponse = await db.query.messageDeliveries.findMany({
        where: and(
          eq(messageDeliveries.messageId, input.messageId),
          eq(messages.orgId, org.id)
        ),
        columns: {
          id: true,
          createdAt: true,
          destinationId: true,
          response: true,
          success: true,
        },
        orderBy: [desc(messageDeliveries.createdAt)],
        with: {
          destination: {
            columns: {
              id: true,
              name: true,
              url: true,
            },
          },
        },
      });

      return deliveriesResponse;
    }),

  replayMessage: orgProcedure
    .input(
      z
        .object({
          id: z.string(),
          endpointId: z.string(),
          path: z.array(z.string()),
        })
        .strict()
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user, org } = ctx;

      await sendMessageToDestinations(
        input.endpointId,
        input.path,
        input.id,
        org.id
      );

      return;
    }),
});
