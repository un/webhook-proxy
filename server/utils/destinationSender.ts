import type { FetchError } from "ofetch";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { endpoints, messageDeliveries, messages } from "~/server/db/schema";
import { isBodyJson } from "./contentType";

export async function sendMessageToDestinations(
  endpointId: string,
  messageId: string,
  orgId: string
) {
  const endpoint = await db.query.endpoints.findFirst({
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
  if (!endpoint || endpoint.orgId !== orgId) return;

  const message = await db.query.messages.findFirst({
    where: eq(messages.id, messageId),
    columns: {
      id: true,
      headers: true,
      body: true,
      bodyJson: true,
      contentType: true,
      endpointId: true,
      method: true,
      orgId: true,
      origin: true,
      response: true,
    },
  });

  if (!message || message.orgId !== orgId) return;
  const payloadHeaders = message.headers;
  const body: BodyInit | Record<string, any> | null | undefined = isBodyJson(
    message.contentType
  )
    ? message.bodyJson
    : message.body;
  if (!body || !payloadHeaders) return;

  // Handle Forwarding to the destinations
  const headersToRemove = ["content-type", "content-length", "connection"];
  const cleanHeaders = Object.fromEntries(
    Object.entries(payloadHeaders)
      .filter(([k]) => !headersToRemove.includes(k.toLowerCase()))
      .map(([k, v]) => [k.toLowerCase(), v])
  );
  async function sendToDestination(index: number) {
    if (!message) return { success: false, response: null };
    if (!endpoint) return { success: false, response: null };
    const destination = endpoint.destinations.find(
      (d) => d.enabled && d.order === index
    );
    if (!destination) return { success: false, response: null };
    // attempt to send to destination
    let responseCode;
    let response;
    try {
      const destinationResponse = await $fetch.raw(
        destination.destination.url,
        {
          method:
            (message.method as
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
          contentType: message.contentType,
          headers: cleanHeaders,
          body: body,
        }
      );
      responseCode = destinationResponse.status;
    } catch (error: any) {
      const errorResponse = error as FetchError;
      responseCode = errorResponse.status;
    }
    const successfulDelivery =
      responseCode === destination.destination.responseCode;

    await db.insert(messageDeliveries).values({
      orgId: endpoint.orgId,
      destinationId: destination.destination.id,
      messageId: message.id,
      success: successfulDelivery,
      response: {
        code: responseCode || 200,
        content: "",
      },
    });
    if (successfulDelivery) {
      return { success: true };
    }
    return { success: false };
  }
  const routingStrategy = endpoint.routingStrategy;
  if (!endpoint.destinations) return;

  if (routingStrategy === "first") {
    let currentIndex = 0;
    let destinationResponse;
    do {
      destinationResponse = await sendToDestination(currentIndex);
      currentIndex++;
    } while (
      !destinationResponse.success &&
      currentIndex < endpoint.destinations.length
    );
  }
  if (routingStrategy === "all") {
    await Promise.all(
      endpoint.destinations.map((d) => sendToDestination(d.order))
    );
  }
  return;
}
