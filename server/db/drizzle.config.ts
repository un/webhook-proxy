// This file is only used for DrizzleKit migrations

import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config();

export default {
  schema: "./server/db/schema.ts",
  out: "./server/db/migrations",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.NUXT_POSTGRES_CONNECTION_STRING || "",
  },
} satisfies Config;
