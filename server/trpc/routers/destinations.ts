import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { limitedProcedure, router, userProcedure, orgProcedure } from "../trpc";
import {
  destinations,
  endpointDestinations,
  endpoints,
  messageDeliveries,
} from "~/server/db/schema";
import { and, desc, eq } from "drizzle-orm";

export const destinationRouter = router({
  create: orgProcedure
    .input(
      z
        .object({
          name: z.string().min(3).max(64),
          url: z.string().min(3).max(256),
        })
        .strict()
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user, org } = ctx;

      if (!user || !org) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to create an organization",
        });
      }

      const newDestination = await db
        .insert(destinations)
        .values({
          name: input.name,
          url: input.url,
          orgId: org.id,
          headers: "{}",
          responseCode: 200,
        })
        .returning({ id: destinations.id });

      return newDestination;
    }),
  getAllDestinations: orgProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx, input }) => {
      const { db, user, org } = ctx;

      const destinationsResponse = await db.query.destinations.findMany({
        where: eq(endpoints.orgId, org.id),
        columns: {
          id: true,
          name: true,
          url: true,
          createdAt: true,
          responseCode: true,
        },
        orderBy: [desc(destinations.createdAt)],
      });

      return destinationsResponse;
    }),
  getDestination: orgProcedure
    .input(z.object({ id: z.string() }).strict())
    .query(async ({ ctx, input }) => {
      const { db, user, org } = ctx;

      const destinationResponse = await db.query.destinations.findFirst({
        where: and(
          eq(destinations.id, input.id),
          eq(destinations.orgId, org.id)
        ),
        columns: {
          id: true,
          name: true,
          createdAt: true,
          url: true,
          responseCode: true,
        },
      });

      return destinationResponse;
    }),
  updateDestination: orgProcedure
    .input(
      z
        .object({
          id: z.string(),
          name: z.string().min(3).max(64),
          url: z.string().min(3).max(256),
          code: z.number().int().min(100).max(599),
        })
        .strict()
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user, org } = ctx;

      await db
        .update(destinations)
        .set({
          name: input.name,
          responseCode: input.code,
          url: input.url,
        })
        .where(
          and(eq(destinations.id, input.id), eq(destinations.orgId, org.id))
        );

      return;
    }),
  deleteDestination: orgProcedure
    .input(
      z
        .object({
          id: z.string(),
        })
        .strict()
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user, org } = ctx;

      await db
        .delete(destinations)
        .where(
          and(eq(destinations.id, input.id), eq(destinations.orgId, org.id))
        );
      await db
        .delete(endpointDestinations)
        .where(
          and(
            eq(endpointDestinations.destinationId, input.id),
            eq(endpointDestinations.orgId, org.id)
          )
        );
      await db
        .delete(messageDeliveries)
        .where(
          and(
            eq(messageDeliveries.destinationId, input.id),
            eq(messageDeliveries.orgId, org.id)
          )
        );

      return;
    }),
});
