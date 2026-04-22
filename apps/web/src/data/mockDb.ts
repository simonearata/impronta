import { z } from "zod";
import {
  HomeContentSchema,
  InventoryMovementSchema,
  ProducerSchema,
  SiteSettingsSchema,
  WineSchema,
  ZoneSchema,
} from "../shared/schemas";
import {
  home as seedHome,
  movements as seedMovements,
  producers as seedProducers,
  settings as seedSettings,
  wines as seedWines,
  zones as seedZones,
} from "./mock";

export const MOCK_DB_KEY = "impronta_mock_db_v2";

export const AdminDbSchema = z.object({
  zones: z.array(ZoneSchema),
  producers: z.array(ProducerSchema),
  wines: z.array(WineSchema),
  home: HomeContentSchema,
  settings: SiteSettingsSchema,
  movements: z.array(InventoryMovementSchema),
});

export type AdminDb = z.infer<typeof AdminDbSchema>;

export function readDb(): AdminDb {
  const raw = localStorage.getItem(MOCK_DB_KEY);
  if (raw) {
    try {
      return AdminDbSchema.parse(JSON.parse(raw));
    } catch {
      localStorage.removeItem(MOCK_DB_KEY);
    }
  }

  const seeded: AdminDb = {
    zones: seedZones,
    producers: seedProducers,
    wines: seedWines,
    home: seedHome,
    settings: seedSettings,
    movements: seedMovements,
  };

  localStorage.setItem(MOCK_DB_KEY, JSON.stringify(seeded));
  return seeded;
}

export function writeDb(db: AdminDb) {
  localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));
}
