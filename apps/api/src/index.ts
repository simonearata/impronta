import "dotenv/config";
import { readEnv } from "./env.js";
import { buildServer } from "./server.js";

const env = readEnv(process.env as any);

const app = await buildServer(env);

await app.listen({ port: env.PORT, host: "0.0.0.0" });
