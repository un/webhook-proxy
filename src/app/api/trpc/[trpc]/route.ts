import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "~/server/trpc";
import { db } from "~/server/db";

export const dynamic = "force-dynamic";

const handler = (req: Request) =>
  fetchRequestHandler({
    req,
    endpoint: "/api/trpc",
    router: appRouter,
    createContext: () => ({ db }),
  });

export { handler as GET, handler as POST };
