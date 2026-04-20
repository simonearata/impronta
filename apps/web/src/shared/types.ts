import type { z } from "zod";
import type {
  ContactLeadCreateSchema,
  HomeContentSchema,
  InventoryMovementInputSchema,
  InventoryMovementSchema,
  MovementTypeSchema,
  ProducerDetailSchema,
  ProducerSchema,
  SiteSettingsSchema,
  WineDetailSchema,
  WineSchema,
  WineTypeSchema,
  ZoneDetailSchema,
  ZoneSchema,
} from "./schemas";

export type WineType = z.infer<typeof WineTypeSchema>;
export type Zone = z.infer<typeof ZoneSchema>;
export type Producer = z.infer<typeof ProducerSchema>;
export type Wine = z.infer<typeof WineSchema>;
export type HomeContent = z.infer<typeof HomeContentSchema>;
export type SiteSettings = z.infer<typeof SiteSettingsSchema>;
export type ContactLeadCreate = z.infer<typeof ContactLeadCreateSchema>;
export type ZoneDetail = z.infer<typeof ZoneDetailSchema>;
export type ProducerDetail = z.infer<typeof ProducerDetailSchema>;
export type WineDetail = z.infer<typeof WineDetailSchema>;
export type MovementType = z.infer<typeof MovementTypeSchema>;
export type InventoryMovement = z.infer<typeof InventoryMovementSchema>;
export type InventoryMovementInput = z.infer<typeof InventoryMovementInputSchema>;
