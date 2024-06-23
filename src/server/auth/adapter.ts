import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { sessions, users } from "../db/schema";
import { db } from "../db";

export const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);
