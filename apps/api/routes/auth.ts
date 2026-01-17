import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";

const AuthLoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const AuthSessionSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  user: z.object({
    email: z.string().email(),
    role: z.literal("admin"),
  }),
});

const OkSchema = z.object({ ok: z.literal(true) });

type Session = z.infer<typeof AuthSessionSchema>;

const byAccess = new Map<string, Session>();
const byRefresh = new Map<string, Session>();

function getBearer(req: any) {
  const raw = String(req.headers?.authorization || "");
  return raw.startsWith("Bearer ") ? raw.slice("Bearer ".length) : "";
}

export function requireAdmin(req: any): Session {
  const tok = getBearer(req);
  const s = tok ? byAccess.get(tok) : null;
  if (!s) {
    const err: any = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }
  return s;
}

function issueSession(email: string): Session {
  const session: Session = {
    accessToken: randomUUID(),
    refreshToken: randomUUID(),
    user: { email, role: "admin" },
  };
  byAccess.set(session.accessToken, session);
  byRefresh.set(session.refreshToken, session);
  return session;
}

function rotateAccess(old: Session): Session {
  byAccess.delete(old.accessToken);

  const next: Session = {
    ...old,
    accessToken: randomUUID(),
  };

  byAccess.set(next.accessToken, next);
  byRefresh.set(next.refreshToken, next);
  return next;
}

function revokeByAccess(accessToken: string) {
  const s = byAccess.get(accessToken);
  if (!s) return;
  byAccess.delete(s.accessToken);
  byRefresh.delete(s.refreshToken);
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (req, reply) => {
    const input = AuthLoginInputSchema.parse((req as any).body);

    const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "").trim();
    const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "");

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      return reply
        .code(500)
        .send("ADMIN_EMAIL/ADMIN_PASSWORD mancanti in apps/api/.env");
    }

    if (input.email !== ADMIN_EMAIL || input.password !== ADMIN_PASSWORD) {
      return reply.code(401).send("Credenziali non valide.");
    }

    return AuthSessionSchema.parse(issueSession(input.email));
  });

  app.post("/auth/refresh", async (req, reply) => {
    const body = z
      .object({ refreshToken: z.string().min(1) })
      .parse((req as any).body);

    const s = byRefresh.get(body.refreshToken);
    if (!s) return reply.code(401).send("Refresh token non valido.");

    return AuthSessionSchema.parse(rotateAccess(s));
  });

  app.post("/auth/logout", async (req) => {
    const accessToken = getBearer(req);
    if (accessToken) revokeByAccess(accessToken);
    return OkSchema.parse({ ok: true });
  });
}
