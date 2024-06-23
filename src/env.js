import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(["development", "production"]).default("development"),
    GITHUB_CLIENT_ID: z.string(),
    GITHUB_CLIENT_SECRET: z.string(),
  },
  client: {
    NEXT_PUBLIC_PRIMARY_DOMAIN: z.string(),
  },
  experimental__runtimeEnv: {
    ...process.env,
    NEXT_PUBLIC_PRIMARY_DOMAIN: process.env.NEXT_PUBLIC_PRIMARY_DOMAIN,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
