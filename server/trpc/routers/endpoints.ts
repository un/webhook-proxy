import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { limitedProcedure, router, userProcedure, orgProcedure } from "../trpc";
import { endpointDestinations, endpoints } from "~/server/db/schema";
import { and, asc, desc, eq, inArray } from "drizzle-orm";

export const endpointRouter = router({
  create: orgProcedure
    .input(
      z
        .object({
          name: z.string().min(3).max(64),
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

      const newEndpoint = await db
        .insert(endpoints)
        .values({
          name: input.name,
          response: { code: 200, content: "ok" },
          routingStrategy: "first",
          orgId: org.id,
        })
        .returning({ id: endpoints.id });

      return newEndpoint;
    }),
  getAllEndpoints: orgProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx, input }) => {
      const { db, user, org } = ctx;

      const endpointsResponse = await db.query.endpoints.findMany({
        where: eq(endpoints.orgId, org.id),
        columns: {
          id: true,
          name: true,
          createdAt: true,
        },
        orderBy: [desc(endpoints.createdAt)],
      });

      return endpointsResponse;
    }),
  getEndpoint: orgProcedure
    .input(z.object({ id: z.string() }).strict())
    .query(async ({ ctx, input }) => {
      const { db, user, org } = ctx;

      const endpointResponse = await db.query.endpoints.findFirst({
        where: and(eq(endpoints.id, input.id), eq(endpoints.orgId, org.id)),
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
            orderBy: asc(endpointDestinations.order),
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
        .where(and(eq(endpoints.id, input.id), eq(endpoints.orgId, org.id)));

      return;
    }),
  setEndpointResponse: orgProcedure
    .input(
      z
        .object({
          id: z.string(),
          code: z.number().min(100).max(999),
          content: z.string().min(1).max(64),
        })
        .strict()
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user, org } = ctx;

      await db
        .update(endpoints)
        .set({
          response: { code: input.code, content: input.content },
        })
        .where(and(eq(endpoints.id, input.id), eq(endpoints.orgId, org.id)));

      return;
    }),
  setEndpointStrategy: orgProcedure
    .input(
      z
        .object({
          id: z.string(),
          strategy: z.enum(["first", "all"]),
        })
        .strict()
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user, org } = ctx;

      await db
        .update(endpoints)
        .set({
          routingStrategy: input.strategy,
        })
        .where(and(eq(endpoints.id, input.id), eq(endpoints.orgId, org.id)));

      return;
    }),
  setEndpointDestinations: orgProcedure
    .input(
      z
        .object({
          id: z.string(),
          destinationIds: z.string().min(3).array(),
        })
        .strict()
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user, org } = ctx;
      const endpointResponse = await db.query.endpoints.findFirst({
        where: and(eq(endpoints.id, input.id), eq(endpoints.orgId, org.id)),
        columns: {
          id: true,
        },
        with: {
          destinations: {
            columns: {
              id: true,
            },
            with: {
              destination: {
                columns: {
                  id: true,
                },
              },
            },
          },
        },
      });

      if (!endpointResponse) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Endpoint not found",
        });
      }

      const existingDestinationIds = endpointResponse.destinations.map(
        (d) => d.destination.id
      );

      const newDestinationIds = input.destinationIds.filter(
        (id) => !existingDestinationIds.includes(id)
      );

      const removedDestinationIds = existingDestinationIds.filter(
        (id) => !input.destinationIds.includes(id)
      );

      if (removedDestinationIds.length > 0) {
        await db
          .delete(endpointDestinations)
          .where(
            and(
              eq(endpointDestinations.endpointId, input.id),
              inArray(endpointDestinations.destinationId, removedDestinationIds)
            )
          );
      }

      if (newDestinationIds.length > 0) {
        await db.insert(endpointDestinations).values(
          newDestinationIds.map((id, index) => ({
            orgId: org.id,
            endpointId: input.id,
            destinationId: id,
            order: input.destinationIds.indexOf(id),
            enabled: true,
          }))
        );
      }

      for (const existingDestination of existingDestinationIds) {
        const newIndex = input.destinationIds.indexOf(existingDestination);
        if (removedDestinationIds.includes(existingDestination)) return;
        if (newIndex === -1) return;
        await db
          .update(endpointDestinations)
          .set({ enabled: true, order: newIndex })
          .where(
            and(
              eq(endpointDestinations.endpointId, input.id),
              eq(endpointDestinations.destinationId, existingDestination)
            )
          );
      }

      return;
    }),
});
