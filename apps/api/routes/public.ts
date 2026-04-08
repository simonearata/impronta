import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../src/prisma.js";
import {
  ContactLeadInputSchema,
  HomeContentSchema,
  OkSchema,
  ProducerDetailSchema,
  ProducerSchema,
  SiteSettingsSchema,
  WineDetailSchema,
  WineSchema,
  WineTypeSchema,
  ZoneDetailSchema,
  ZoneSchema,
} from "../src/schemas.js";
import {
  homeOut,
  producerOut,
  settingsOut,
  wineOut,
  zoneOut,
} from "../src/serializers.js";

function qContains(q: string) {
  return { contains: q, mode: "insensitive" as const };
}

const ZonesQuerySchema = z.object({
  country: z.string().optional(),
  region: z.string().optional(),
  q: z.string().optional(),
});

const ProducersQuerySchema = z.object({
  zone: z.string().optional(),
  q: z.string().optional(),
});

const WinesQuerySchema = z.object({
  zone: z.string().optional(),
  producer: z.string().optional(),
  type: WineTypeSchema.optional(),
  vintage: z.string().optional(),
  q: z.string().optional(),
});

const SlugParamsSchema = z.object({ slug: z.string().min(1) });

export async function publicRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ ok: true }));

  app.get("/home", async () => {
    const row = await prisma.homeContent.findUnique({ where: { id: 1 } });
    if (!row) throw new Error("HomeContent mancante");
    return HomeContentSchema.parse(homeOut(row));
  });

  app.get("/settings", async () => {
    const row = await prisma.siteSettings.findUnique({ where: { id: 1 } });
    if (!row) throw new Error("SiteSettings mancante");
    return SiteSettingsSchema.parse(settingsOut(row));
  });

  app.get("/zones", async (req) => {
    const query = ZonesQuerySchema.parse((req as any).query);

    const where: any = {};
    if (query.country) where.country = query.country;
    if (query.region) where.region = query.region;
    if (query.q) {
      where.name = qContains(query.q);
    }

    const rows = await prisma.zone.findMany({
      where,
      orderBy: { name: "asc" },
    });
    return z.array(ZoneSchema).parse(rows.map(zoneOut));
  });

  app.get("/zones/:slug", async (req, reply) => {
    const { slug } = SlugParamsSchema.parse((req as any).params);

    const zone = await prisma.zone.findUnique({ where: { slug } });
    if (!zone) return reply.code(404).send("Zona non trovata");

    const producers = await prisma.producer.findMany({
      where: { zoneId: zone.id },
      orderBy: { name: "asc" },
    });

    const out = { zone: zoneOut(zone), producers: producers.map(producerOut) };
    return ZoneDetailSchema.parse(out);
  });

  app.get("/producers", async (req) => {
    const query = ProducersQuerySchema.parse((req as any).query);

    let zoneId: string | null = null;
    if (query.zone) {
      const zrow = await prisma.zone.findUnique({
        where: { slug: query.zone },
      });
      zoneId = zrow?.id ?? null;
      if (!zoneId) return z.array(ProducerSchema).parse([]);
    }

    const where: any = {};
    if (zoneId) where.zoneId = zoneId;
    if (query.q) {
      where.name = qContains(query.q);
    }

    const rows = await prisma.producer.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return z.array(ProducerSchema).parse(rows.map(producerOut));
  });

  app.get("/producers/:slug", async (req) => {
    const { slug } = SlugParamsSchema.parse((req as any).params);

    const producer = await prisma.producer.findUnique({ where: { slug } });
    if (!producer) throw new Error("Azienda non trovata");

    const zone = await prisma.zone.findUnique({
      where: { id: producer.zoneId },
    });
    if (!zone) throw new Error("Zona mancante");

    const wines = await prisma.wine.findMany({
      where: { producerId: producer.id },
      orderBy: { name: "asc" },
    });

    const out = {
      producer: producerOut(producer),
      zone: zoneOut(zone),
      wines: wines.map(wineOut),
    };

    return ProducerDetailSchema.parse(out);
  });

  app.get("/wines", async (req) => {
    const query = WinesQuerySchema.parse((req as any).query);

    let zoneId: string | null = null;
    if (query.zone) {
      const zrow = await prisma.zone.findUnique({
        where: { slug: query.zone },
      });
      zoneId = zrow?.id ?? null;
      if (!zoneId) return z.array(WineSchema).parse([]);
    }

    let producerId: string | null = null;
    if (query.producer) {
      const prow = await prisma.producer.findUnique({
        where: { slug: query.producer },
      });
      producerId = prow?.id ?? null;
      if (!producerId) return z.array(WineSchema).parse([]);
    }

    let vintage: number | null = null;
    if (query.vintage && query.vintage.trim()) {
      const v = Number(query.vintage);
      if (Number.isFinite(v)) vintage = v;
      else return z.array(WineSchema).parse([]);
    }

    const where: any = {};
    if (producerId) where.producerId = producerId;
    if (query.type) where.type = query.type;
    if (vintage != null) where.vintage = vintage;

    if (query.q) {
      where.name = qContains(query.q);
    }

    if (zoneId) {
      where.producer = { zoneId };
    }

    const rows = await prisma.wine.findMany({
      where,
      orderBy: [{ isAvailable: "desc" }, { name: "asc" }],
    });

    return z.array(WineSchema).parse(rows.map(wineOut));
  });

  app.get("/wines/:slug", async (req) => {
    const { slug } = SlugParamsSchema.parse((req as any).params);

    const wine = await prisma.wine.findUnique({ where: { slug } });
    if (!wine) throw new Error("Vino non trovato");

    const producer = await prisma.producer.findUnique({
      where: { id: wine.producerId },
    });
    if (!producer) throw new Error("Azienda mancante");

    const zone = await prisma.zone.findUnique({
      where: { id: producer.zoneId },
    });
    if (!zone) throw new Error("Zona mancante");

    const out = {
      wine: wineOut(wine),
      producer: producerOut(producer),
      zone: zoneOut(zone),
    };

    return WineDetailSchema.parse(out);
  });

  app.post("/contact", async (req) => {
    const payload = ContactLeadInputSchema.parse((req as any).body);

    await prisma.contactLead.create({
      data: {
        name: payload.name,
        email: payload.email,
        phone: payload.phone?.trim() ? payload.phone.trim() : null,
        subject: payload.subject,
        message: payload.message,
      },
    });

    return OkSchema.parse({ ok: true });
  });
}
