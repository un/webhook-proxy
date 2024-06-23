import { createCaller } from "~/server/trpc";
import { db } from "~/server/db";
import "server-only";

export const trpcServer = createCaller({ db });
