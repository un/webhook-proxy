import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { endpoints, messageDeliveries, messages } from "~/server/db/schema";
import { sendMessageToDestinations } from "~/server/utils/destinationSender";
export default defineEventHandler(async (event) => {
  // get endpoint data
  const endpointId = getRouterParam(event, "endpointId")?.split("/")?.[0];
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
  const payloadBody = await readRawBody(event);
  const requestHost = getRequestHost(event);
  const requestMethod = event.node.req.method as string;
  const contentTypeUnparsed = getHeader(event, "content-type");
  if (!endpointResponse) return sendNoContent(event, 404);
  if (!payloadBody || !payloadHeaders) return sendNoContent(event, 400);
  setResponseStatus(event, endpointResponse.response.code);
  await send(event, endpointResponse.response.content, "application/text");

  // parse the content type
  const contentType = contentTypeUnparsed?.split(";")[0] || "application/json";
  const isJson = isBodyJson(contentType);
  const bodyJson = isJson ? JSON.parse(payloadBody) : null;

  // save the message to the database
  const messageInsert = await db
    .insert(messages)
    .values({
      orgId: endpointResponse.orgId,
      headers: payloadHeaders,
      bodyJson: bodyJson,
      body: payloadBody,
      endpointId: endpointId,
      origin: requestHost,
      method: requestMethod,
      contentType: contentTypeUnparsed || "application/json",
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
