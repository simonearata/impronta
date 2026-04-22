import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import statik from "@fastify/static";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { ZodError } from "zod";
import { publicRoutes } from "../routes/public.js";
import { authRoutes } from "../routes/auth.js";
import { adminRoutes } from "../routes/admin.js";
import type { Env } from "./env.js";

export async function buildServer(env: Env) {
  const app = Fastify({ logger: true });

  app.setErrorHandler((err: any, _req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({ ok: false, issues: err.issues });
    }

    const error = err as Error & { statusCode?: number };
    const status = error.statusCode ?? 500;
    return reply.code(status).send({ ok: false, message: error.message });
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
  });

  await app.register(multipart, {
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB (per PDF fatture)
  });

  const uploadDirAbs = resolve(env.UPLOAD_DIR);
  await mkdir(uploadDirAbs, { recursive: true });

  await app.register(statik, {
    root: uploadDirAbs,
    prefix: "/uploads/",
  });

  await app.register(publicRoutes);
  await app.register(authRoutes);
  await app.register(adminRoutes);

  return app;
}
