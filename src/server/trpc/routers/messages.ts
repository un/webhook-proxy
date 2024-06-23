// import { sendMessageToDestinations } from "~/server/utils/destinationSender";
import { endpoints, messageDeliveries, messages } from "~/server/db/schema";
import { typeIdGenerator, typeIdValidator } from "~/server/utils/typeid";
import { sendToDestinations } from "../../utils/send-to-destinations";
import { router, orgProcedure } from "../trpc";
import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const messageRouter = router({
  getEndpointMessages: orgProcedure
    .input(
      z.object({
        publicId: typeIdValidator("endpoint"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { db, org } = ctx;

      const endpoint = await db.query.endpoints.findFirst({
        where: and(eq(endpoints.publicId, input.publicId), eq(endpoints.orgId, org.id)),
        columns: {
          id: true,
        },
      });

      if (!endpoint) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No endpoint found",
        });
      }

      const messagesResponse = await db.query.messages.findMany({
        where: eq(messages.endpointId, endpoint.id),
        columns: {
          publicId: true,
          headers: true,
          // origin: true,
          body: true,
          // response: true,
          createdAt: true,
          // contentType: true,
          method: true,
          path: true,
        },
        orderBy: [desc(messages.createdAt)],
      });

      return messagesResponse;
    }),

  getMessagesDeliveries: orgProcedure
    .input(
      z.object({
        messagePublicId: typeIdValidator("message"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { db, org } = ctx;

      const message = await db.query.messages.findFirst({
        where: and(eq(messages.publicId, input.messagePublicId), eq(messages.orgId, org.id)),
        columns: {
          id: true,
        },
      });

      if (!message) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No message found",
        });
      }

      const deliveriesResponse = await db.query.messageDeliveries.findMany({
        where: eq(messageDeliveries.messageId, message.id),
        columns: {
          publicId: true,
          createdAt: true,
          destinationId: true,
          response: true,
          success: true,
        },
        orderBy: [desc(messageDeliveries.createdAt)],
        with: {
          destination: {
            columns: {
              publicId: true,
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
      z.object({
        messagePublicId: typeIdValidator("message"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { org, db } = ctx;
      const message = await ctx.db.query.messages.findFirst({
        where: and(eq(messages.publicId, input.messagePublicId), eq(messages.orgId, org.id)),
        with: {
          endpoint: {
            with: {
              destinations: {
                with: {
                  destination: true,
                },
              },
            },
          },
        },
      });

      if (!message) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No message found",
        });
      }

      const destinations = message.endpoint.destinations
        .filter((d) => d.enabled)
        .sort((a, b) => a.order - b.order)
        .map((d) => ({
          publicId: d.destination.publicId,
          url: d.destination.url,
          id: d.destinationId,
        }));

      const results = await sendToDestinations({
        destinations,
        message: {
          body: message.body as string,
          headers: message.headers,
          method: message.method,
          path: message.path,
        },
        routingStrategy: message.endpoint.routingStrategy,
      });

      await Promise.all(
        results.map(async (result) => {
          const body = (await result.response?.text()) ?? "";
          const success = result.response?.ok ?? false;
          const status = result.response?.status ?? -1;
          await db.insert(messageDeliveries).values({
            destinationId: result.id,
            messageId: message.id,
            success,
            orgId: org.id,
            publicId: typeIdGenerator("messageDelivery"),
            response: {
              code: status,
              content: body,
            },
          });
        }),
      );
    }),
});
