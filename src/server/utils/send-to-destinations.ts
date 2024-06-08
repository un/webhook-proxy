import type { TypeId } from "./typeid";

type SendToDestinationsOptions = {
  message: {
    body: string;
    headers: Record<string, string>;
    method: string;
    path: string;
  };
  destinations: { publicId: TypeId<"destination">; url: string; id: number }[];
  routingStrategy: "first" | "all";
};

export async function sendToDestinations(options: SendToDestinationsOptions) {
  const { message, destinations, routingStrategy } = options;
  const { body, headers, method, path } = message;

  if (routingStrategy === "first") {
    const failedAttempts: ({ response: null } & (typeof destinations)[number])[] = [];
    for (const destination of destinations) {
      try {
        const response = await fetch(destination.url + path, {
          body,
          headers,
          method,
        });
        if (!response.ok) {
          throw new Error(`Failed to send message to ${destination.url}`);
        }
        return [...failedAttempts, { response, ...destination }];
      } catch (error) {
        console.error(error);
        failedAttempts.push({ response: null, ...destination });
      }
    }
    return failedAttempts;
  } else {
    const responses = await Promise.all(
      destinations.map(async (destination) => {
        try {
          const response = await fetch(destination.url + path, {
            body,
            headers,
            method,
          });
          if (!response.ok) {
            throw new Error(`Failed to send message to ${destination.url}`);
          }
          return { response, ...destination };
        } catch (error) {
          console.error(error);
          return { response: null, ...destination };
        }
      }),
    );
    return responses;
  }
}
