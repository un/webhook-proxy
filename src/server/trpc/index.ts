import { destinationRouter } from "./routers/destinations";
import { endpointRouter } from "./routers/endpoints";
import { createCallerFactory, router } from "./trpc";
import { messageRouter } from "./routers/messages";

export const appRouter = router({
  destinations: destinationRouter,
  endpoints: endpointRouter,
  messages: messageRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
