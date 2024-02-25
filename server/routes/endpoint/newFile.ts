import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { endpoints, messageDeliveries, messages } from "~/server/db/schema";

export default defineEventHandler(async (event) => {
  // get endpoint data
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
              responseCode: true,
            },
          },
        },
      },
    },
  });

  // send the responses to the client
  const payloadHeaders = getHeaders(event);
  const payloadBody = await readBody(event);
  const requestHost = getRequestHost(event);
  if (!endpointResponse) return sendNoContent(event, 404);
  if (!payloadBody || !payloadHeaders) return sendNoContent(event, 400);
  setResponseStatus(event, endpointResponse.response.code);
  await send(event, endpointResponse.response.content, "application/text");

  // save the message to the database
  const messageInsert = await db
    .insert(messages)
    .values({
      body: payloadBody,
      headers: payloadHeaders,
      endpointId: endpointId,
      orgId: endpointResponse.orgId,
      origin: requestHost,
      response: {
        code: endpointResponse.response.code,
        content: endpointResponse.response.content,
      },
    })
    .returning({ id: messages.id });

  // Handle Forwarding to the destinations
  const headersToRemove = ["content-type", "content-length", "connection"];
  const cleanHeaders = Object.fromEntries(
    Object.entries(payloadHeaders)
      .filter(([k]) => !headersToRemove.includes(k.toLowerCase()))
      .map(([k, v]) => [k.toLowerCase(), v])
  );
  async function sendToDestination(index: number) {
    if (!endpointResponse) return { success: false, response: null };
    const destination = endpointResponse.destinations.find(
      (d) => d.enabled && d.order === index
    );
    if (!destination) return { success: false, response: null };
    // attempt to send to destination
    const destinationResponse = await $fetch.raw(destination.destination.url, {
      method:
        (event.node.req.method as
          | "GET"
          | "HEAD"
          | "PATCH"
          | "POST"
          | "PUT"
          | "DELETE"
          | "CONNECT"
          | "OPTIONS"
          | "TRACE"
          | undefined) || "POST",
      // @ts-ignore - header formating
      headers: cleanHeaders,
      body: payloadBody,
    });

    const responseCode = destinationResponse.status;
    const successfulDelivery =
      responseCode === destination.destination.responseCode;

    await db.insert(messageDeliveries).values({
      orgId: endpointResponse.orgId,
      destinationId: destination.destination.id,
      messageId: messageInsert[0].id,
      success: successfulDelivery,
      response: {
        code: responseCode,
        content: "",
      },
    });
    if (successfulDelivery) {
      return { success: true, response: destinationResponse };
    }
    return { success: false, response: destinationResponse };
  }
  const routingStrategy = endpointResponse.routingStrategy;
  if (!endpointResponse.destinations) return;

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

  return;
});
