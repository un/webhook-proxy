import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { endpoints, messageDeliveries, messages } from "~/server/db/schema";
export default defineEventHandler(async (event) => {
  console.log("event", event.node.req.method);

  const endpointId = getRouterParam(event, "endpointId");
  if (!endpointId) return sendNoContent(event, 404);
  const endpointResponse = await db.query.endpoints.findFirst({
    where: eq(endpoints.id, endpointId),
    columns: {
      id: true,
      name: true,
      orgId: true,
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
              url: true,
            },
          },
        },
      },
    },
  });
  if (!endpointResponse) return sendNoContent(event, 404);

  const payloadHeaders = getHeaders(event);
  const payloadBody = await readBody(event);
  const requestHost = getRequestHost(event);
  const requestIp = getRequestIP(event);
  if (!payloadBody || !payloadHeaders) return sendNoContent(event, 400);

  const messageInsert = await db
    .insert(messages)
    .values({
      body: payloadBody,
      headers: payloadHeaders,
      endpointId: endpointId,
      orgId: endpointResponse.orgId,
      origin: requestHost,
      response: {
        code: 200,
        content: "OK",
      },
    })
    .returning({ id: messages.id });

  // Forward to the destinations
  async function sendToDestination(index: number) {
    if (!endpointResponse) return { success: false, response: null };
    const destination = endpointResponse.destinations.find(
      (d) => d.enabled && d.order === index
    );
    if (!destination) return { success: false, response: null };
    // attempt to send to destination
    const destinationResponse = await fetch(destination.destination.url, {
      method: event.node.req.method,
      headers: event.headers,
      body: payloadBody,
    });
    await db.insert(messageDeliveries).values({
      destinationId: destination.destination.id,
      messageId: messageInsert[0].id,
      response: {
        code: destinationResponse.status,
        content: await destinationResponse.json(),
      },
    });
    if (destinationResponse.ok) {
      return { success: true, response: destinationResponse };
    }
    return { success: false, response: destinationResponse };
  }
  const routingStrategy = endpointResponse.routingStrategy;
  if (routingStrategy === "first") {
    let currentIndex = 0;
    let destinationResponse;
    do {
      destinationResponse = await sendToDestination(currentIndex);
      currentIndex++;
    } while (
      !destinationResponse.success &&
      currentIndex < endpointResponse.destinations.length
    );
  }
  if (routingStrategy === "all") {
    await Promise.all(
      endpointResponse.destinations.map((d) => sendToDestination(d.order))
    );
  }

  setResponseStatus(event, endpointResponse.response.code);
  return send(event, endpointResponse.response.content, "application/json");
});
