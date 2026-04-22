import { z } from "zod";

export const WineTypeSchema = z.enum([
  "white",
  "red",
  "rose",
  "orange",
  "sparkling",
  "other",
]);

export const ZoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  country: z.string(),
  region: z.string(),
  descriptionShort: z.string(),
  descriptionLong: z.string(),
  coverImageUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ProducerSchema = z.object({
  id: z.string(),
  zoneId: z.string(),
  name: z.string(),
  slug: z.string(),
  philosophyShort: z.string(),
  storyLong: z.string(),
  location: z.string().nullable(),
  website: z.string().nullable(),
  instagram: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const WineSchema = z.object({
  id: z.string(),
  producerId: z.string(),
  name: z.string(),
  slug: z.string(),
  vintage: z.number().int().nullable(),
  type: WineTypeSchema,
  grapes: z.string().nullable(),
  alcohol: z.string().nullable(),
  vinification: z.string().nullable(),
  tastingNotes: z.string().nullable(),
  pairing: z.string().nullable(),
  priceCents: z.number().int().nullable(),
  isAvailable: z.boolean(),
  bottleSizeMl: z.number().int().nullable(),
  imageUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const HomeContentSchema = z.object({
  heroImageUrl: z.string().nullable(),
  heroQuote: z.string(),
  story: z.string(),
  vision: z.string(),
  mission: z.string(),
  featuredZoneIds: z.array(z.string()),
  featuredProducerIds: z.array(z.string()),
  featuredWineIds: z.array(z.string()).default([]),
});

export const SiteSettingsSchema = z.object({
  contactEmail: z.string(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  hours: z.string().nullable(),
  socials: z.record(z.string()).or(z.record(z.any())),
});

export const ContactLeadInputSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(3).optional(),
  subject: z.string().min(3),
  message: z.string().min(10),
});

export const ZoneDetailSchema = z.object({
  zone: ZoneSchema,
  producers: z.array(ProducerSchema),
});

export const ProducerDetailSchema = z.object({
  producer: ProducerSchema,
  zone: ZoneSchema,
  wines: z.array(WineSchema),
});

export const WineDetailSchema = z.object({
  wine: WineSchema,
  producer: ProducerSchema,
  zone: ZoneSchema,
  stock: z.number().nullable().optional(),
});

export const OkSchema = z.object({ ok: z.literal(true) });

export const MovementTypeSchema = z.enum(["in", "out", "adjustment"]);

export const InventoryMovementSchema = z.object({
  id: z.string(),
  wineId: z.string().nullable(),
  wineName: z.string(),
  type: MovementTypeSchema,
  quantity: z.number(),
  unitPriceCents: z.number().int().nullable(),
  invoiceNumber: z.string().nullable(),
  invoiceDate: z.string().nullable(),
  supplierOrCustomer: z.string().nullable(),
  invoiceFileUrl: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const InventoryMovementInputSchema = z.object({
  wineId: z.string().nullable().optional(),
  wineName: z.string().min(1),
  type: MovementTypeSchema,
  quantity: z.number().refine((v) => v !== 0, "La quantità non può essere zero"),
  unitPriceCents: z.number().int().positive().nullable().optional(),
  invoiceNumber: z.string().nullable().optional(),
  invoiceDate: z.string().nullable().optional(),
  supplierOrCustomer: z.string().nullable().optional(),
  invoiceFileUrl: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const GeminiLineSchema = z.object({
  wineName: z.string(),
  quantity: z.number().positive(),
  unitPriceCents: z.number().int().nullable(),
  notes: z.string().nullable(),
});

export const GeminiExtractedSchema = z.object({
  type: MovementTypeSchema,
  invoiceNumber: z.string().nullable(),
  invoiceDate: z.string().nullable(),
  supplierOrCustomer: z.string().nullable(),
  lines: z.array(GeminiLineSchema).min(1),
});
