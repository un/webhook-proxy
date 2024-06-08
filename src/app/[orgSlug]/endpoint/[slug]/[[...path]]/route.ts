import { endpoints, messageDeliveries, messages, orgs } from "~/server/db/schema";
import { sendToDestinations } from "~/server/utils/send-to-destinations";
import { typeIdGenerator } from "~/server/utils/typeid";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "~/server/db";

const handler = async (
  req: Request,
  { params }: { params: { slug: string; orgSlug: string; path: string[] } },
) => {
  const { slug, orgSlug, path = [] } = params;
  const { method } = req;
  const org = await db.query.orgs.findFirst({
    columns: { id: true },
    where: eq(orgs.slug, orgSlug),
  });
  if (!org) return new NextResponse("Not Found", { status: 404 });
  const endpoint = await db.query.endpoints.findFirst({
    columns: {
      id: true,
      routingStrategy: true,
    },
    with: {
      destinations: {
        columns: {
          destinationId: true,
          enabled: true,
          order: true,
        },
        with: {
          destination: {
            columns: {
              url: true,
              publicId: true,
            },
          },
        },
      },
    },
    where: and(eq(endpoints.slug, slug), eq(endpoints.orgId, org.id)),
  });
  if (!endpoint) return new NextResponse("Not Found", { status: 404 });

  const body = await req.text();
  const headers = Object.fromEntries(req.headers.entries());
  const fullPath = `/${path.join("/")}`;
  const messagePublicId = typeIdGenerator("message");

  const [messageInsert] = await db
    .insert(messages)
    .values({
      orgId: org.id,
      endpointId: endpoint.id,
      method,
      path: fullPath,
      headers,
      body,
      publicId: messagePublicId,
    })
    .returning();
  if (!messageInsert) {
    console.error("Failed to insert message into database.");
    return new NextResponse("Internal Server Error", { status: 500 });
  }

  const destinationsToSend = endpoint.destinations
    .filter((d) => d.enabled)
    .sort((a, b) => a.order - b.order)
    .map((d) => ({
      publicId: d.destination.publicId,
      url: d.destination.url,
      id: d.destinationId,
    }));

  const results = await sendToDestinations({
    routingStrategy: endpoint.routingStrategy,
    destinations: destinationsToSend,
    message: {
      body,
      headers,
      method,
      path: fullPath,
    },
  }).catch((e) => {
    console.error(e);
    return [];
  });

  await Promise.all(
    results.map(async (result) => {
      const body = (await result.response?.text()) ?? "";
      const success = result.response?.ok ?? false;
      const status = result.response?.status ?? -1;
      await db.insert(messageDeliveries).values({
        destinationId: result.id,
        messageId: messageInsert.id,
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

  return new NextResponse("OK");
};

export { handler as POST };
