export * from "@trpc/server";
import { router } from "./trpc";
import { createContext } from "./createContext";
// import { emailRouter } from './routers/authRouter/emailRouter';

export const trpcWebAppContext = createContext;

export const trpcWebAppRouter = router({
  // auth: trpcWebAppAuthRouter,
  // user: trpcWebAppUserRouter,
  // org: trpcWebAppOrgRouter,
  // convos: convoRouter,
  // test: testRouter,
});

export type TrpcWebAppRouter = typeof trpcWebAppRouter;
