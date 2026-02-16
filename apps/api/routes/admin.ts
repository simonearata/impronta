import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/prisma.js";
import { OkSchema, SiteSettingsSchema } from "../src/schemas.js";
import { settingsOut } from "../src/serializers.js";

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

const accessSessions = new Set<string>();
const refreshSessions = new Set<string>();

function getBearer(req: any) {
  const raw = String(req.headers?.authorization || "");
  return raw.startsWith("Bearer ") ? raw.slice("Bearer ".length) : "";
}

function requireAdmin(req: any) {
  const token = getBearer(req);
  if (!token || !accessSessions.has(token)) {
    const err: any = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }
  return token;
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

    const accessToken = randomUUID();
    const refreshToken = randomUUID();

    accessSessions.add(accessToken);
    refreshSessions.add(refreshToken);

    return AdminLoginOutSchema.parse({ ok: true, accessToken, refreshToken });
  });

  app.post("/admin/refresh", async (req, reply) => {
    const body = AdminRefreshSchema.parse((req as any).body);

    if (!refreshSessions.has(body.refreshToken)) {
      return reply.code(401).send("Refresh token non valido");
    }

    refreshSessions.delete(body.refreshToken);

    const accessToken = randomUUID();
    const refreshToken = randomUUID();

    accessSessions.add(accessToken);
    refreshSessions.add(refreshToken);

    return AdminLoginOutSchema.parse({ ok: true, accessToken, refreshToken });
  });

  app.post("/admin/logout", async (req) => {
    const token = getBearer(req);
    if (token) accessSessions.delete(token);
    return OkSchema.parse({ ok: true });
  });

  app.get("/admin/settings", async (req) => {
    requireAdmin(req);

    const row = await prisma.siteSettings.findUnique({ where: { id: 1 } });
    if (!row) throw new Error("SiteSettings mancante");

    return SiteSettingsSchema.parse(settingsOut(row));
  });

  app.put("/admin/settings", async (req) => {
    requireAdmin(req);

    const payload = SiteSettingsSchema.parse((req as any).body);

    await prisma.siteSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        contactEmail: payload.contactEmail,
        phone: payload.phone,
        address: payload.address,
        hours: payload.hours,
        socials: payload.socials as any,
      },
      update: {
        contactEmail: payload.contactEmail,
        phone: payload.phone,
        address: payload.address,
        hours: payload.hours,
        socials: payload.socials as any,
      },
    });

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
      })),
    );
  });
}
