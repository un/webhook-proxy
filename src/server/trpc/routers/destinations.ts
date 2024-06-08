import {
  destinations,
  endpointDestinations,
  endpoints,
  messageDeliveries,
} from "~/server/db/schema";
import { typeIdGenerator, typeIdValidator } from "~/server/utils/typeid";
import { router, orgProcedure } from "../trpc";
import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const destinationRouter = router({
  create: orgProcedure
    .input(
      z.object({
        name: z.string().min(3).max(64),
        url: z.string().min(3).max(1024),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;

      const newDestination = await db
        .insert(destinations)
        .values({
          name: input.name,
          url: input.url,
          orgId: org.id,
          // headers: "{}",
          // responseCode: 200,
          publicId: typeIdGenerator("destination"),
        })
        .returning({ publicId: destinations.publicId });

      return newDestination;
    }),
  getAllDestinations: orgProcedure.query(async ({ ctx }) => {
    const { db, org } = ctx;

    const destinationsResponse = await db.query.destinations.findMany({
      where: eq(endpoints.orgId, org.id),
      columns: {
        publicId: true,
        name: true,
        url: true,
        createdAt: true,
      },
      orderBy: [desc(destinations.createdAt)],
    });

    return destinationsResponse;
  }),
  getDestination: orgProcedure
    .input(z.object({ publicId: typeIdValidator("destination") }))
    .query(async ({ ctx, input }) => {
      const { db, org } = ctx;

      const destinationResponse = await db.query.destinations.findFirst({
        where: and(eq(destinations.publicId, input.publicId), eq(destinations.orgId, org.id)),
        columns: {
          id: true,
          name: true,
          createdAt: true,
          url: true,
          // responseCode: true,
        },
      });

      return destinationResponse;
    }),
  updateDestination: orgProcedure
    .input(
      z.object({
        publicId: typeIdValidator("destination"),
        name: z.string().min(3).max(64).optional(),
        url: z.string().min(3).max(1024).optional(),
        code: z.number().int().min(100).max(599).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;
      if (!input.name && !input.url && !input.code) return;

      await db
        .update(destinations)
        .set({
          name: input.name ?? undefined,
          // responseCode: input.code ?? undefined,
          url: input.url ?? undefined,
        })
        .where(and(eq(destinations.publicId, input.publicId), eq(destinations.orgId, org.id)));
    }),
  deleteDestination: orgProcedure
    .input(
      z.object({
        publicId: typeIdValidator("destination"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;

      const destination = await db.query.destinations.findFirst({
        where: and(eq(destinations.publicId, input.publicId), eq(destinations.orgId, org.id)),
        columns: {
          id: true,
        },
      });

      if (!destination) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Destination not found",
        });
      }

      await db.delete(destinations).where(eq(destinations.id, destination.id));
      await db
        .delete(endpointDestinations)
        .where(
          and(
            eq(endpointDestinations.destinationId, destination.id),
            eq(endpointDestinations.orgId, org.id),
          ),
        );
      await db
        .delete(messageDeliveries)
        .where(
          and(
            eq(messageDeliveries.destinationId, destination.id),
            eq(messageDeliveries.orgId, org.id),
          ),
        );
    }),
});
