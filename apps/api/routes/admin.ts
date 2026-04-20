import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { prisma } from "../src/prisma.js";
import {
  GeminiExtractedSchema,
  HomeContentSchema,
  InventoryMovementInputSchema,
  InventoryMovementSchema,
  OkSchema,
  ProducerSchema,
  SiteSettingsSchema,
  WineSchema,
  WineTypeSchema,
  ZoneSchema,
} from "../src/schemas.js";
import {
  homeOut,
  movementOut,
  producerOut,
  settingsOut,
  wineOut,
  zoneOut,
} from "../src/serializers.js";
import { extractInvoice, isSupportedMime } from "../src/gemini.js";

/* ────────────────────────────────────────
   AUTH (in-memory sessions)
   ──────────────────────────────────────── */

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

/* ────────────────────────────────────────
   INPUT SCHEMAS (for PUT/upsert bodies)
   ──────────────────────────────────────── */

const ZoneInputSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  country: z.string().min(1),
  region: z.string().min(1),
  descriptionShort: z.string(),
  descriptionLong: z.string(),
  coverImageUrl: z.string().nullable().optional(),
});

const ProducerInputSchema = z.object({
  zoneId: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  philosophyShort: z.string(),
  storyLong: z.string(),
  location: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  coverImageUrl: z.string().nullable().optional(),
});

const WineInputSchema = z.object({
  producerId: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  vintage: z.number().int().nullable().optional(),
  type: WineTypeSchema,
  grapes: z.string().nullable().optional(),
  alcohol: z.string().nullable().optional(),
  vinification: z.string().nullable().optional(),
  tastingNotes: z.string().nullable().optional(),
  pairing: z.string().nullable().optional(),
  priceCents: z.number().int().nullable().optional(),
  isAvailable: z.boolean().optional().default(true),
  bottleSizeMl: z.number().int().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
});

const IdParamSchema = z.object({ id: z.string().min(1) });

/* ────────────────────────────────────────
   ROUTES
   ──────────────────────────────────────── */

export async function adminRoutes(app: FastifyInstance) {
  /* ── AUTH ────────────────────────────── */

  app.post("/admin/login", async (req, reply) => {
    const body = AdminLoginSchema.parse((req as any).body);

    // Cerca l'admin nel DB
    const admin = await prisma.adminUser.findUnique({
      where: { email: body.email },
    });

    if (!admin) return reply.code(401).send("Credenziali non valide");

    // Confronta password con hash bcrypt
    const match = await bcrypt.compare(body.password, admin.passwordHash);
    if (!match) return reply.code(401).send("Credenziali non valide");

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

  /* ── SETTINGS ───────────────────────── */

  app.get("/admin/settings", async (req) => {
    requireAdmin(req);

    const row = await prisma.siteSettings.findUnique({ where: { id: 1 } });
    if (!row) throw new Error("SiteSettings mancante");

    return SiteSettingsSchema.parse(settingsOut(row));
  });

  app.put("/admin/settings", async (req) => {
    requireAdmin(req);

    const payload = SiteSettingsSchema.parse((req as any).body);

    const row = await prisma.siteSettings.upsert({
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

    return SiteSettingsSchema.parse(settingsOut(row));
  });

  /* ── CONTACT LEADS ──────────────────── */

  app.get("/admin/contact-leads", async (req) => {
    requireAdmin(req);

    const rows = await prisma.contactLead.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return z.array(ContactLeadOutSchema).parse(
      rows.map((r: typeof rows[number]) => ({
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

  app.delete("/admin/contact-leads/:id", async (req, reply) => {
    requireAdmin(req);
    const { id } = IdParamSchema.parse((req as any).params);

    const existing = await prisma.contactLead.findUnique({ where: { id } });
    if (!existing)
      return reply.code(404).send({ ok: false, message: "Lead non trovato" });

    await prisma.contactLead.delete({ where: { id } });
    return OkSchema.parse({ ok: true });
  });

  /* ── CHANGE PASSWORD ─────────────────── */

  const ChangePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(6, "La nuova password deve avere almeno 6 caratteri"),
  });

  app.post("/admin/change-password", async (req, reply) => {
    requireAdmin(req);
    const body = ChangePasswordSchema.parse((req as any).body);

    // Prende il primo admin (singolo admin)
    const admin = await prisma.adminUser.findFirst();
    if (!admin) return reply.code(500).send("Admin non trovato nel DB");

    // Verifica password attuale con bcrypt
    const match = await bcrypt.compare(
      body.currentPassword,
      admin.passwordHash,
    );
    if (!match) return reply.code(400).send("Password attuale non corretta");

    // Hasha la nuova password e salva nel DB
    const newHash = await bcrypt.hash(body.newPassword, 12);
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { passwordHash: newHash },
    });

    // Invalida tutte le sessioni → forza re-login
    accessSessions.clear();
    refreshSessions.clear();

    return OkSchema.parse({ ok: true });
  });

  /* ── RESET PASSWORD (genera token + invia email) ──── */

  const ResetRequestSchema = z.object({
    email: z.string().email(),
  });

  app.post("/admin/request-reset", async (req) => {
    const body = ResetRequestSchema.parse((req as any).body);

    const admin = await prisma.adminUser.findUnique({
      where: { email: body.email },
    });

    // Risponde sempre "ok" per non rivelare se l'email esiste
    if (!admin) return OkSchema.parse({ ok: true });

    // Genera un token casuale con scadenza 1 ora
    const resetToken = randomUUID();
    const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { resetToken, resetTokenExpiresAt },
    });

    // Costruisci il link di reset
    const frontendUrl = (
      process.env.CORS_ORIGIN || "http://localhost:5173"
    ).replace(/\/$/, "");
    const resetLink = `${frontendUrl}/admin/reset-password?token=${resetToken}`;

    // Invia email con Resend
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@impronta.local";

    if (resendKey) {
      try {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: fromEmail,
          to: admin.email,
          subject: "Impronta — Reset password",
          html: `
            <div style="font-family: 'Courier New', Courier, monospace; max-width: 480px; margin: 0 auto; padding: 32px;">
              <h2 style="font-size: 20px; font-weight: bold; text-transform: uppercase;">Impronta</h2>
              <p style="margin-top: 16px; font-size: 14px; line-height: 1.6; color: #333;">
                Hai richiesto il reset della password. Clicca il link qui sotto per impostarne una nuova.
                Il link scade tra 1 ora.
              </p>
              <a href="${resetLink}"
                 style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #588b8b; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">
                Reimposta password
              </a>
              <p style="margin-top: 24px; font-size: 12px; color: #888; line-height: 1.5;">
                Se non hai richiesto questo reset, ignora questa email. La tua password non verrà modificata.
              </p>
              <p style="margin-top: 8px; font-size: 11px; color: #aaa; word-break: break-all;">
                ${resetLink}
              </p>
            </div>
          `,
        });
        console.log(`Reset email inviata a ${admin.email}`);
      } catch (emailErr) {
        // L'email fallisce ma il token è nel DB — logga per debug
        console.error("Errore invio email reset:", emailErr);
        console.log(`FALLBACK — Token reset per ${admin.email}: ${resetToken}`);
        console.log(`Link: ${resetLink}`);
      }
    } else {
      // Nessuna API key Resend — fallback a console log
      console.log(`\n========================================`);
      console.log(`RESEND_API_KEY non configurata.`);
      console.log(`Reset password per ${admin.email}:`);
      console.log(`Link: ${resetLink}`);
      console.log(`Scade: ${resetTokenExpiresAt.toISOString()}`);
      console.log(`========================================\n`);
    }

    return OkSchema.parse({ ok: true });
  });

  /* ── RESET PASSWORD (usa token) ──────── */

  const ResetPasswordSchema = z.object({
    token: z.string().min(1),
    newPassword: z.string().min(6),
  });

  app.post("/admin/reset-password", async (req, reply) => {
    const body = ResetPasswordSchema.parse((req as any).body);

    const admin = await prisma.adminUser.findUnique({
      where: { resetToken: body.token },
    });

    if (!admin) return reply.code(400).send("Token non valido o scaduto");

    // Verifica scadenza
    if (!admin.resetTokenExpiresAt || admin.resetTokenExpiresAt < new Date()) {
      // Pulisci il token scaduto
      await prisma.adminUser.update({
        where: { id: admin.id },
        data: { resetToken: null, resetTokenExpiresAt: null },
      });
      return reply.code(400).send("Token scaduto. Richiedine uno nuovo.");
    }

    // Hasha la nuova password, salva, e pulisci il token
    const newHash = await bcrypt.hash(body.newPassword, 12);
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        passwordHash: newHash,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });

    // Invalida tutte le sessioni
    accessSessions.clear();
    refreshSessions.clear();

    return OkSchema.parse({ ok: true });
  });

  /* ── ZONES ──────────────────────────── */

  app.get("/admin/zones", async (req) => {
    requireAdmin(req);
    const rows = await prisma.zone.findMany({ orderBy: { name: "asc" } });
    return z.array(ZoneSchema).parse(rows.map(zoneOut));
  });

  app.get("/admin/zones/:id", async (req, reply) => {
    requireAdmin(req);
    const { id } = IdParamSchema.parse((req as any).params);

    const row = await prisma.zone.findUnique({ where: { id } });
    if (!row)
      return reply.code(404).send({ ok: false, message: "Zona non trovata" });

    return ZoneSchema.parse(zoneOut(row));
  });

  app.put("/admin/zones/:id", async (req) => {
    requireAdmin(req);
    const { id } = IdParamSchema.parse((req as any).params);
    const input = ZoneInputSchema.parse((req as any).body);

    // Check slug uniqueness
    const slugConflict = await prisma.zone.findUnique({
      where: { slug: input.slug },
    });
    if (slugConflict && slugConflict.id !== id) {
      const err: any = new Error("Slug già in uso per una zona.");
      err.statusCode = 409;
      throw err;
    }

    const row = await prisma.zone.upsert({
      where: { id },
      create: {
        id,
        name: input.name,
        slug: input.slug,
        country: input.country,
        region: input.region,
        descriptionShort: input.descriptionShort,
        descriptionLong: input.descriptionLong,
        coverImageUrl: input.coverImageUrl ?? null,
      },
      update: {
        name: input.name,
        slug: input.slug,
        country: input.country,
        region: input.region,
        descriptionShort: input.descriptionShort,
        descriptionLong: input.descriptionLong,
        coverImageUrl: input.coverImageUrl ?? null,
      },
    });

    return ZoneSchema.parse(zoneOut(row));
  });

  app.delete("/admin/zones/:id", async (req, reply) => {
    requireAdmin(req);
    const { id } = IdParamSchema.parse((req as any).params);

    const existing = await prisma.zone.findUnique({ where: { id } });
    if (!existing)
      return reply.code(404).send({ ok: false, message: "Zona non trovata" });

    const producerCount = await prisma.producer.count({
      where: { zoneId: id },
    });
    if (producerCount > 0) {
      const err: any = new Error(
        "Impossibile eliminare: esistono aziende collegate a questa zona.",
      );
      err.statusCode = 409;
      throw err;
    }

    await prisma.zone.delete({ where: { id } });
    return OkSchema.parse({ ok: true });
  });

  /* ── PRODUCERS ──────────────────────── */

  app.get("/admin/producers", async (req) => {
    requireAdmin(req);
    const rows = await prisma.producer.findMany({ orderBy: { name: "asc" } });
    return z.array(ProducerSchema).parse(rows.map(producerOut));
  });

  app.get("/admin/producers/:id", async (req, reply) => {
    requireAdmin(req);
    const { id } = IdParamSchema.parse((req as any).params);

    const row = await prisma.producer.findUnique({ where: { id } });
    if (!row)
      return reply
        .code(404)
        .send({ ok: false, message: "Azienda non trovata" });

    return ProducerSchema.parse(producerOut(row));
  });

  app.put("/admin/producers/:id", async (req) => {
    requireAdmin(req);
    const { id } = IdParamSchema.parse((req as any).params);
    const input = ProducerInputSchema.parse((req as any).body);

    const zone = await prisma.zone.findUnique({ where: { id: input.zoneId } });
    if (!zone) {
      const err: any = new Error("Zona non valida.");
      err.statusCode = 400;
      throw err;
    }

    const slugConflict = await prisma.producer.findUnique({
      where: { slug: input.slug },
    });
    if (slugConflict && slugConflict.id !== id) {
      const err: any = new Error("Slug già in uso per un'azienda.");
      err.statusCode = 409;
      throw err;
    }

    const row = await prisma.producer.upsert({
      where: { id },
      create: {
        id,
        zoneId: input.zoneId,
        name: input.name,
        slug: input.slug,
        philosophyShort: input.philosophyShort,
        storyLong: input.storyLong,
        location: input.location ?? null,
        website: input.website ?? null,
        instagram: input.instagram ?? null,
        coverImageUrl: input.coverImageUrl ?? null,
      },
      update: {
        zoneId: input.zoneId,
        name: input.name,
        slug: input.slug,
        philosophyShort: input.philosophyShort,
        storyLong: input.storyLong,
        location: input.location ?? null,
        website: input.website ?? null,
        instagram: input.instagram ?? null,
        coverImageUrl: input.coverImageUrl ?? null,
      },
    });

    return ProducerSchema.parse(producerOut(row));
  });

  app.delete("/admin/producers/:id", async (req, reply) => {
    requireAdmin(req);
    const { id } = IdParamSchema.parse((req as any).params);

    const existing = await prisma.producer.findUnique({ where: { id } });
    if (!existing)
      return reply
        .code(404)
        .send({ ok: false, message: "Azienda non trovata" });

    const wineCount = await prisma.wine.count({ where: { producerId: id } });
    if (wineCount > 0) {
      const err: any = new Error(
        "Impossibile eliminare: esistono vini collegati a questa azienda.",
      );
      err.statusCode = 409;
      throw err;
    }

    await prisma.producer.delete({ where: { id } });
    return OkSchema.parse({ ok: true });
  });

  /* ── WINES ──────────────────────────── */

  app.get("/admin/wines", async (req) => {
    requireAdmin(req);
    const rows = await prisma.wine.findMany({
      orderBy: [{ isAvailable: "desc" }, { name: "asc" }],
    });
    return z.array(WineSchema).parse(rows.map(wineOut));
  });

  app.get("/admin/wines/:id", async (req, reply) => {
    requireAdmin(req);
    const { id } = IdParamSchema.parse((req as any).params);

    const row = await prisma.wine.findUnique({ where: { id } });
    if (!row)
      return reply.code(404).send({ ok: false, message: "Vino non trovato" });

    return WineSchema.parse(wineOut(row));
  });

  app.put("/admin/wines/:id", async (req) => {
    requireAdmin(req);
    const { id } = IdParamSchema.parse((req as any).params);
    const input = WineInputSchema.parse((req as any).body);

    const producer = await prisma.producer.findUnique({
      where: { id: input.producerId },
    });
    if (!producer) {
      const err: any = new Error("Azienda non valida.");
      err.statusCode = 400;
      throw err;
    }

    const slugConflict = await prisma.wine.findUnique({
      where: { slug: input.slug },
    });
    if (slugConflict && slugConflict.id !== id) {
      const err: any = new Error("Slug già in uso per un vino.");
      err.statusCode = 409;
      throw err;
    }

    const row = await prisma.wine.upsert({
      where: { id },
      create: {
        id,
        producerId: input.producerId,
        name: input.name,
        slug: input.slug,
        vintage: input.vintage ?? null,
        type: input.type,
        grapes: input.grapes ?? null,
        alcohol: input.alcohol ?? null,
        vinification: input.vinification ?? null,
        tastingNotes: input.tastingNotes ?? null,
        pairing: input.pairing ?? null,
        priceCents: input.priceCents ?? null,
        isAvailable: input.isAvailable,
        bottleSizeMl: input.bottleSizeMl ?? null,
        imageUrl: input.imageUrl ?? null,
      },
      update: {
        producerId: input.producerId,
        name: input.name,
        slug: input.slug,
        vintage: input.vintage ?? null,
        type: input.type,
        grapes: input.grapes ?? null,
        alcohol: input.alcohol ?? null,
        vinification: input.vinification ?? null,
        tastingNotes: input.tastingNotes ?? null,
        pairing: input.pairing ?? null,
        priceCents: input.priceCents ?? null,
        isAvailable: input.isAvailable,
        bottleSizeMl: input.bottleSizeMl ?? null,
        imageUrl: input.imageUrl ?? null,
      },
    });

    return WineSchema.parse(wineOut(row));
  });

  app.delete("/admin/wines/:id", async (req, reply) => {
    requireAdmin(req);
    const { id } = IdParamSchema.parse((req as any).params);

    const existing = await prisma.wine.findUnique({ where: { id } });
    if (!existing)
      return reply.code(404).send({ ok: false, message: "Vino non trovato" });

    await prisma.wine.delete({ where: { id } });
    return OkSchema.parse({ ok: true });
  });

  /* ── HOME CONTENT ───────────────────── */

  app.get("/admin/home", async (req) => {
    requireAdmin(req);

    const row = await prisma.homeContent.findUnique({ where: { id: 1 } });
    if (!row) throw new Error("HomeContent mancante");

    return HomeContentSchema.parse(homeOut(row));
  });

  app.put("/admin/home", async (req) => {
    requireAdmin(req);

    const payload = HomeContentSchema.parse((req as any).body);

    const homeData = {
      heroImageUrl: payload.heroImageUrl,
      heroQuote: payload.heroQuote,
      story: payload.story,
      vision: payload.vision,
      mission: payload.mission,
      featuredZoneIds: payload.featuredZoneIds,
      featuredProducerIds: payload.featuredProducerIds,
      featuredWineIds: payload.featuredWineIds ?? [],
    };

    await prisma.homeContent.upsert({
      where: { id: 1 },
      create: { id: 1, ...homeData },
      update: homeData,
    });

    return HomeContentSchema.parse(homeOut(await prisma.homeContent.findUniqueOrThrow({ where: { id: 1 } })));
  });

  /* ── UPLOAD IMMAGINI ────────────────── */

  const ALLOWED_MIME = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
  ]);

  const EXT_MAP: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
  };

  app.post("/admin/upload", async (req, reply) => {
    requireAdmin(req);

    const file = await (req as any).file();
    if (!file) {
      return reply
        .code(400)
        .send({ ok: false, message: "Nessun file inviato." });
    }

    const mime = file.mimetype;
    if (!ALLOWED_MIME.has(mime)) {
      return reply.code(400).send({
        ok: false,
        message: `Tipo file non supportato: ${mime}. Usa JPEG, PNG, WebP, GIF o AVIF.`,
      });
    }

    const ext = EXT_MAP[mime] || ".bin";
    const filename = `${randomUUID()}${ext}`;

    const uploadDir = resolve(process.env.UPLOAD_DIR || "./uploads");
    await mkdir(uploadDir, { recursive: true });

    const buf = await file.toBuffer();
    await writeFile(resolve(uploadDir, filename), buf);

    const baseUrl = (
      process.env.PUBLIC_UPLOAD_BASE_URL || "http://localhost:3001/uploads"
    ).replace(/\/$/, "");
    const url = `${baseUrl}/${filename}`;

    return { ok: true, url };
  });

  /* ── INVENTORY ──────────────────────── */

  app.get("/admin/inventory", async (req) => {
    requireAdmin(req);
    const rows = await prisma.inventoryMovement.findMany({
      orderBy: { createdAt: "desc" },
    });
    return z.array(InventoryMovementSchema).parse(rows.map(movementOut));
  });

  app.post("/admin/inventory", async (req, reply) => {
    requireAdmin(req);
    const input = InventoryMovementInputSchema.parse((req as any).body);
    const row = await prisma.inventoryMovement.create({
      data: {
        wineId: input.wineId ?? null,
        wineName: input.wineName,
        type: input.type as any,
        quantity: input.quantity,
        unitPriceCents: input.unitPriceCents ?? null,
        invoiceNumber: input.invoiceNumber ?? null,
        invoiceDate: input.invoiceDate ?? null,
        supplierOrCustomer: input.supplierOrCustomer ?? null,
        invoiceFileUrl: input.invoiceFileUrl ?? null,
        notes: input.notes ?? null,
      },
    });
    return reply.code(201).send(InventoryMovementSchema.parse(movementOut(row)));
  });

  app.put("/admin/inventory/:id", async (req, reply) => {
    requireAdmin(req);
    const { id } = IdParamSchema.parse((req as any).params);
    const input = InventoryMovementInputSchema.parse((req as any).body);
    const row = await prisma.inventoryMovement.update({
      where: { id },
      data: {
        wineId: input.wineId ?? null,
        wineName: input.wineName,
        type: input.type as any,
        quantity: input.quantity,
        unitPriceCents: input.unitPriceCents ?? null,
        invoiceNumber: input.invoiceNumber ?? null,
        invoiceDate: input.invoiceDate ?? null,
        supplierOrCustomer: input.supplierOrCustomer ?? null,
        invoiceFileUrl: input.invoiceFileUrl ?? null,
        notes: input.notes ?? null,
      },
    });
    return InventoryMovementSchema.parse(movementOut(row));
  });

  app.delete("/admin/inventory/:id", async (req, reply) => {
    requireAdmin(req);
    const { id } = IdParamSchema.parse((req as any).params);
    await prisma.inventoryMovement.delete({ where: { id } });
    return reply.code(204).send();
  });

  app.get("/admin/inventory/stock/:wineId", async (req) => {
    requireAdmin(req);
    const { wineId } = z.object({ wineId: z.string().min(1) }).parse((req as any).params);
    const rows = await prisma.inventoryMovement.findMany({ where: { wineId } });
    const stock = rows.reduce((acc: number, m) => {
      if (m.type === "in") return acc + m.quantity;
      if (m.type === "out") return acc - m.quantity;
      return acc + m.quantity;
    }, 0);
    return { wineId, stock };
  });

  /* ── EXTRACT FATTURA (Gemini) ───────── */

  app.post("/admin/inventory/extract", async (req, reply) => {
    requireAdmin(req);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return reply.code(503).send({ ok: false, message: "GEMINI_API_KEY non configurata." });
    }

    const file = await (req as any).file();
    if (!file) {
      return reply.code(400).send({ ok: false, message: "Nessun file inviato." });
    }

    if (!isSupportedMime(file.mimetype)) {
      return reply.code(400).send({
        ok: false,
        message: `Formato non supportato: ${file.mimetype}. Usa JPEG, PNG, WebP o PDF.`,
      });
    }

    const buf = await file.toBuffer();

    // Salva il file per riferimento futuro
    const ext = file.mimetype === "application/pdf" ? ".pdf"
      : file.mimetype === "image/png" ? ".png" : ".jpg";
    const filename = `invoice_${randomUUID()}${ext}`;
    const uploadDir = resolve(process.env.UPLOAD_DIR || "./uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(resolve(uploadDir, filename), buf);
    const baseUrl = (process.env.PUBLIC_UPLOAD_BASE_URL || "http://localhost:3001/uploads").replace(/\/$/, "");
    const invoiceFileUrl = `${baseUrl}/${filename}`;

    const extracted = await extractInvoice(apiKey, buf, file.mimetype);

    return { ...GeminiExtractedSchema.parse(extracted), invoiceFileUrl };
  });
}
