import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/prisma.js";
import { OkSchema } from "../src/schemas.js";

const AdminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const AdminLoginOutSchema = z.object({
  ok: z.literal(true),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

const AdminRefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const ContactLeadOutSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  subject: z.string(),
  message: z.string(),
  createdAt: z.string(),
});

type Session = { refreshToken: string };

const sessions = new Map<string, Session>();
const refreshIndex = new Map<string, string>();

function getBearer(req: any) {
  const raw = String(req.headers?.authorization || "");
  return raw.startsWith("Bearer ") ? raw.slice("Bearer ".length) : "";
}

function requireAdmin(req: any) {
  const token = getBearer(req);
  if (!token || !sessions.has(token)) {
    const err: any = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }
  return token;
}

function createSession() {
  const accessToken = randomUUID();
  const refreshToken = randomUUID();
  sessions.set(accessToken, { refreshToken });
  refreshIndex.set(refreshToken, accessToken);
  return { accessToken, refreshToken };
}

function deleteSessionByAccessToken(accessToken: string) {
  const s = sessions.get(accessToken);
  if (s) refreshIndex.delete(s.refreshToken);
  sessions.delete(accessToken);
}

function deleteSessionByRefreshToken(refreshToken: string) {
  const accessToken = refreshIndex.get(refreshToken);
  if (accessToken) deleteSessionByAccessToken(accessToken);
  refreshIndex.delete(refreshToken);
}

export async function adminRoutes(app: FastifyInstance) {
  app.post("/admin/login", async (req, reply) => {
    const body = AdminLoginSchema.parse((req as any).body);

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      return reply
        .code(500)
        .send("ADMIN_EMAIL/ADMIN_PASSWORD mancanti in .env");
    }

    const ok = body.email === ADMIN_EMAIL && body.password === ADMIN_PASSWORD;
    if (!ok) return reply.code(401).send("Credenziali non valide");

    const s = createSession();
    return AdminLoginOutSchema.parse({ ok: true, ...s });
  });

  app.post("/admin/refresh", async (req, reply) => {
    const body = AdminRefreshSchema.parse((req as any).body);

    const accessToken = refreshIndex.get(body.refreshToken);
    if (!accessToken) return reply.code(401).send("Refresh token non valido");

    deleteSessionByRefreshToken(body.refreshToken);

    const s = createSession();
    return AdminLoginOutSchema.parse({ ok: true, ...s });
  });

  app.post("/admin/logout", async (req) => {
    const accessToken = getBearer(req);
    if (accessToken) deleteSessionByAccessToken(accessToken);
    return OkSchema.parse({ ok: true });
  });

  app.get("/admin/contact-leads", async (req) => {
    requireAdmin(req);

    const rows = await prisma.contactLead.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return z.array(ContactLeadOutSchema).parse(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        subject: r.subject,
        message: r.message,
        createdAt: r.createdAt.toISOString(),
      }))
    );
  });
}
