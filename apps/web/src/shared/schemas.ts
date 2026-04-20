import { z } from "zod";
import { EmailSchema } from "./validators";

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
  website: z.string().url().nullable(),
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
  heroQuote: z.string().trim().min(1),
  story: z.string().trim().min(1),
  vision: z.string().trim().min(1),
  mission: z.string().trim().min(1),
  featuredZoneIds: z.array(z.string()),
  featuredProducerIds: z.array(z.string()),
  featuredWineIds: z.array(z.string()).default([]),
});

export type HomeContent = z.infer<typeof HomeContentSchema>;

export const SiteSettingsSchema = z.object({
  contactEmail: z.string().email(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  hours: z.string().nullable(),
  socials: z.record(z.string(), z.string()).default({}),
});

export const ContactLeadCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  subject: z.string().min(2),
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

export const AuthUserSchema = z.object({
  email: EmailSchema,
  role: z.literal("admin"),
});

export const AuthSessionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: AuthUserSchema,
});

export const AuthLoginInputSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1),
});

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
  wineId: z.string().nullable(),
  wineName: z.string().min(1),
  type: MovementTypeSchema,
  quantity: z.number().refine((v) => v !== 0, "La quantità non può essere zero"),
  unitPriceCents: z.number().int().positive().nullable(),
  invoiceNumber: z.string().nullable(),
  invoiceDate: z.string().nullable(),
  supplierOrCustomer: z.string().nullable(),
  invoiceFileUrl: z.string().nullable(),
  notes: z.string().nullable(),
});
