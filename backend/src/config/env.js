
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error(
    "Invalid environment configuration:",
    result.error.flatten().fieldErrors
  );

  process.exit(1);
}

export const env = result.data;
