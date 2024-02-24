export * from "@trpc/server";
import { router } from "./trpc";
import { createContext } from "./createContext";
import { endpointRouter } from "./routers/endpoints";
import { messageRouter } from "./routers/messages";
import { destinationRouter } from "./routers/destinations";

export const trpcWebAppContext = createContext;

export const trpcWebAppRouter = router({
  destinations: destinationRouter,
  endpoints: endpointRouter,
  messages: messageRouter,
});

export type TrpcWebAppRouter = typeof trpcWebAppRouter;
