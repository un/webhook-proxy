import { destinations, endpointDestinations, endpoints } from "~/server/db/schema";
import { typeIdGenerator, typeIdValidator } from "~/server/utils/typeid";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { router, orgProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const endpointRouter = router({
  create: orgProcedure
    .input(
      z.object({
        name: z.string().min(3).max(64),
        slug: z.string().min(3).max(64),
        routingStrategy: z.enum(["first", "all"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;

      const existingEndpoint = await db.query.endpoints.findFirst({
        where: and(eq(endpoints.slug, input.slug), eq(endpoints.orgId, org.id)),
      });

      if (existingEndpoint) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Endpoint with that slug already exists",
        });
      }

      const [newEndpoint] = await db
        .insert(endpoints)
        .values({
          name: input.name,
          // response: { code: 200, content: "ok" },
          routingStrategy: input.routingStrategy,
          orgId: org.id,
          slug: input.slug,
          publicId: typeIdGenerator("endpoint"),
        })
        .returning({ publicId: endpoints.publicId });

      if (!newEndpoint) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create endpoint",
        });
      }

      return newEndpoint;
    }),
  getAllEndpoints: orgProcedure.query(async ({ ctx }) => {
    const { db, org } = ctx;

    const endpointsResponse = await db.query.endpoints.findMany({
      where: eq(endpoints.orgId, org.id),
      columns: {
        name: true,
        createdAt: true,
        slug: true,
        routingStrategy: true,
        publicId: true,
      },
      orderBy: [desc(endpoints.createdAt)],
    });

    return endpointsResponse;
  }),
  getEndpoint: orgProcedure
    .input(z.object({ publicId: typeIdValidator("endpoint") }))
    .query(async ({ ctx, input }) => {
      const { db, org } = ctx;

      const endpointResponse = await db.query.endpoints.findFirst({
        where: and(eq(endpoints.publicId, input.publicId), eq(endpoints.orgId, org.id)),
        columns: {
          name: true,
          createdAt: true,
          // response: true,
          routingStrategy: true,
          slug: true,
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
                  publicId: true,
                  name: true,
                  url: true,
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
      z.object({
        publicId: typeIdValidator("endpoint"),
        name: z.string().min(3).max(64).optional(),
        slug: z.string().min(3).max(64).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;
      if (!input.name && !input.slug) return;
      await db
        .update(endpoints)
        .set({
          name: input.name ?? undefined,
          slug: input.slug ?? undefined,
        })
        .where(and(eq(endpoints.publicId, input.publicId), eq(endpoints.orgId, org.id)));
    }),
  setEndpointResponse: orgProcedure
    .input(
      z.object({
        publicId: typeIdValidator("endpoint"),
        code: z.number().min(100).max(999),
        content: z.string().min(1).max(64),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;

      await db
        .update(endpoints)
        .set({
          // response: input,
        })
        .where(and(eq(endpoints.publicId, input.publicId), eq(endpoints.orgId, org.id)));
    }),
  setEndpointStrategy: orgProcedure
    .input(
      z.object({
        publicId: typeIdValidator("endpoint"),
        strategy: z.enum(["first", "all"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;

      await db
        .update(endpoints)
        .set({
          routingStrategy: input.strategy,
        })
        .where(and(eq(endpoints.publicId, input.publicId), eq(endpoints.orgId, org.id)));
    }),
  addEndpointDestination: orgProcedure
    .input(
      z.object({
        publicId: typeIdValidator("endpoint"),
        destinationPublicId: typeIdValidator("destination"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const endpointResponse = await db.query.endpoints.findFirst({
        where: and(eq(endpoints.publicId, input.publicId), eq(endpoints.orgId, org.id)),
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
                  publicId: true,
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

      const destinationResponse = await db.query.destinations.findFirst({
        where: and(
          eq(destinations.publicId, input.destinationPublicId),
          eq(destinations.orgId, org.id),
        ),
        columns: {
          id: true,
        },
      });

      if (!destinationResponse) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Destination not found",
        });
      }

      const existingDestinationPublicIds = endpointResponse.destinations.map(
        (d) => d.destination.publicId,
      );

      if (existingDestinationPublicIds.includes(input.destinationPublicId)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Destination already exists",
        });
      }

      await db.insert(endpointDestinations).values({
        orgId: org.id,
        endpointId: endpointResponse.id,
        destinationId: destinationResponse.id,
        order: existingDestinationPublicIds.length,
        enabled: true,
      });
    }),
  removeEndpointDestination: orgProcedure
    .input(
      z.object({
        publicId: typeIdValidator("endpoint"),
        destinationPublicId: typeIdValidator("destination"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const endpointResponse = await db.query.endpoints.findFirst({
        where: and(eq(endpoints.publicId, input.publicId), eq(endpoints.orgId, org.id)),
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
                  publicId: true,
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

      const destinationResponse = await db.query.destinations.findFirst({
        where: and(
          eq(destinations.publicId, input.destinationPublicId),
          eq(destinations.orgId, org.id),
        ),
        columns: {
          id: true,
        },
      });

      if (!destinationResponse) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Destination not found",
        });
      }

      const destinationId = destinationResponse.id;

      await db
        .delete(endpointDestinations)
        .where(
          and(
            eq(endpointDestinations.endpointId, endpointResponse.id),
            eq(endpointDestinations.destinationId, destinationId),
          ),
        );
    }),
  setEndpointDestinations: orgProcedure
    .input(
      z.object({
        publicId: typeIdValidator("endpoint"),
        destinationPublicIds: typeIdValidator("destination").array(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const endpointResponse = await db.query.endpoints.findFirst({
        where: and(eq(endpoints.publicId, input.publicId), eq(endpoints.orgId, org.id)),
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
                  publicId: true,
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

      const existingDestinationPublicIds = endpointResponse.destinations.map(
        (d) => d.destination.publicId,
      );

      const newDestinationPublicIds = input.destinationPublicIds.filter(
        (id) => !existingDestinationPublicIds.includes(id),
      );

      const removedDestinationPublicIds = existingDestinationPublicIds.filter(
        (id) => !input.destinationPublicIds.includes(id),
      );

      if (removedDestinationPublicIds.length > 0) {
        const removedDestinationIds = endpointResponse.destinations
          .filter((d) => removedDestinationPublicIds.includes(d.destination.publicId))
          .map((d) => d.id);

        await db
          .delete(endpointDestinations)
          .where(
            and(
              eq(endpointDestinations.endpointId, endpointResponse.id),
              inArray(endpointDestinations.destinationId, removedDestinationIds),
            ),
          );
      }

      if (newDestinationPublicIds.length > 0) {
        const newDestinationIdSet = await db.query.destinations
          .findMany({
            where: inArray(destinations.publicId, newDestinationPublicIds),
            columns: {
              id: true,
              publicId: true,
            },
          })
          .then((destinations) => destinations.map((d) => [d.id, d.publicId] as const));

        await db.insert(endpointDestinations).values(
          newDestinationIdSet.map(([id, publicId]) => ({
            orgId: org.id,
            endpointId: endpointResponse.id,
            destinationId: id,
            order: input.destinationPublicIds.indexOf(publicId),
            enabled: true,
          })),
        );
      }

      for (const [
        existingDestinationId,
        existingDestinationPublicId,
      ] of endpointResponse.destinations.map(
        (d) => [d.destination.id, d.destination.publicId] as const,
      )) {
        const newIndex = input.destinationPublicIds.indexOf(existingDestinationPublicId);
        if (removedDestinationPublicIds.includes(existingDestinationPublicId)) return;
        if (newIndex === -1) return;
        await db
          .update(endpointDestinations)
          .set({ enabled: true, order: newIndex })
          .where(
            and(
              eq(endpointDestinations.endpointId, endpointResponse.id),
              eq(endpointDestinations.destinationId, existingDestinationId),
            ),
          );
      }
    }),
});
