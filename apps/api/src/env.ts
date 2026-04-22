import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.coerce.number().default(3001),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  UPLOAD_DIR: z.string().default("./uploads"),
  PUBLIC_UPLOAD_BASE_URL: z.string().default("http://localhost:3001/uploads"),
  GEMINI_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function readEnv(input: Record<string, unknown>): Env {
  return EnvSchema.parse(input);
}
