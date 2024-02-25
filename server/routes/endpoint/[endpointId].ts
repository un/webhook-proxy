import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { endpoints, messageDeliveries, messages } from "~/server/db/schema";
import { sendMessageToDestinations } from "~/server/utils/destinationSender";
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
  const requestMethod = event.node.req.method as string;
  const contentType = getHeader(event, "content-type");
  const body = JSON.stringify(payloadBody) ?? payloadBody.toString();
  if (!endpointResponse) return sendNoContent(event, 404);
  if (!payloadBody || !payloadHeaders) return sendNoContent(event, 400);
  setResponseStatus(event, endpointResponse.response.code);
  await send(event, endpointResponse.response.content, "application/text");

  // save the message to the database
  const messageInsert = await db
    .insert(messages)
    .values({
      orgId: endpointResponse.orgId,
      headers: payloadHeaders,
      body: body,
      endpointId: endpointId,
      origin: requestHost,
      method: requestMethod,
      contentType: contentType || "application/json",
      response: {
        code: endpointResponse.response.code,
        content: endpointResponse.response.content,
      },
    })
    .returning({ id: messages.id });

  sendMessageToDestinations(
    endpointId,
    messageInsert[0].id,
    endpointResponse.orgId
  );

  return;
});
