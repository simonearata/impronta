import useSWR, { mutate } from "swr";
import { z } from "zod";
import type {
  HomeContent,
  Producer,
  SiteSettings,
  Wine,
  WineType,
  Zone,
} from "../shared/types";
import {
  HomeContentSchema,
  ProducerSchema,
  SiteSettingsSchema,
  WineSchema,
  WineTypeSchema,
  ZoneSchema,
} from "../shared/schemas";
import {
  home as seedHome,
  producers as seedProducers,
  settings as seedSettings,
  wines as seedWines,
  zones as seedZones,
} from "./mock";
import { DATA_SOURCE as MODE } from "./config";
import { apiRequest } from "./api";

const KEY = "impronta_mock_db_v1";

const AdminDbSchema = z.object({
  zones: z.array(ZoneSchema),
  producers: z.array(ProducerSchema),
  wines: z.array(WineSchema),
  home: HomeContentSchema,
  settings: SiteSettingsSchema,
});

type AdminDb = z.infer<typeof AdminDbSchema>;

function now() {
  return new Date().toISOString();
}

function newId() {
  const c = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `id_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function readDb(): AdminDb {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    try {
      return AdminDbSchema.parse(JSON.parse(raw));
    } catch {
      localStorage.removeItem(KEY);
    }
  }

  const seeded: AdminDb = {
    zones: seedZones,
    producers: seedProducers,
    wines: seedWines,
    home: seedHome,
    settings: seedSettings,
  };

  localStorage.setItem(KEY, JSON.stringify(seeded));
  return seeded;
}

function writeDb(db: AdminDb) {
  localStorage.setItem(KEY, JSON.stringify(db));
}

function slugTaken(
  list: Array<{ id: string; slug: string }>,
  slug: string,
  excludeId?: string
) {
  return list.some((x) => x.slug === slug && x.id !== excludeId);
}

export async function adminListZones(): Promise<Zone[]> {
  if (MODE === "api")
    return apiRequest(z.array(ZoneSchema), "/admin/zones", undefined, {
      auth: true,
    });
  return readDb().zones;
}

export async function adminGetZone(id: string): Promise<Zone> {
  if (MODE === "api")
    return apiRequest(
      ZoneSchema,
      `/admin/zones/${encodeURIComponent(id)}`,
      undefined,
      {
        auth: true,
      }
    );
  const z0 = readDb().zones.find((x) => x.id === id);
  if (!z0) throw new Error("Zona non trovata");
  return z0;
}

export async function adminUpsertZone(
  input: Omit<Zone, "createdAt" | "updatedAt"> & { createdAt?: string }
): Promise<Zone> {
  if (MODE === "api")
    return apiRequest(
      ZoneSchema,
      `/admin/zones/${encodeURIComponent(input.id || "new")}`,
      { method: "PUT", body: JSON.stringify(input) },
      { auth: true }
    );

  const db = readDb();
  const isNew = !input.id || !db.zones.some((z0) => z0.id === input.id);
  const id = isNew ? newId() : input.id;

  if (slugTaken(db.zones, input.slug, isNew ? undefined : id))
    throw new Error("Slug già in uso per una zona.");

  const createdAt = isNew
    ? now()
    : db.zones.find((x) => x.id === id)?.createdAt || now();

  const zone: Zone = ZoneSchema.parse({
    ...input,
    id,
    coverImageUrl: input.coverImageUrl ?? null,
    createdAt,
    updatedAt: now(),
  });

  const next = isNew
    ? [zone, ...db.zones]
    : db.zones.map((x) => (x.id === id ? zone : x));
  writeDb({ ...db, zones: next });
  mutate("admin:zones");
  return zone;
}

export async function adminDeleteZone(id: string): Promise<void> {
  if (MODE === "api") {
    await apiRequest(
      z.object({ ok: z.literal(true) }),
      `/admin/zones/${encodeURIComponent(id)}`,
      { method: "DELETE" },
      { auth: true }
    );
    return;
  }

  const db = readDb();
  const hasProducers = db.producers.some((p) => p.zoneId === id);
  if (hasProducers)
    throw new Error(
      "Impossibile eliminare: esistono aziende collegate a questa zona."
    );

  writeDb({ ...db, zones: db.zones.filter((x) => x.id !== id) });
  mutate("admin:zones");
}

export async function adminListProducers(): Promise<Producer[]> {
  if (MODE === "api")
    return apiRequest(z.array(ProducerSchema), "/admin/producers", undefined, {
      auth: true,
    });
  return readDb().producers;
}

export async function adminGetProducer(id: string): Promise<Producer> {
  if (MODE === "api")
    return apiRequest(
      ProducerSchema,
      `/admin/producers/${encodeURIComponent(id)}`,
      undefined,
      { auth: true }
    );
  const p = readDb().producers.find((x) => x.id === id);
  if (!p) throw new Error("Azienda non trovata");
  return p;
}

export async function adminUpsertProducer(
  input: Omit<Producer, "createdAt" | "updatedAt"> & { createdAt?: string }
): Promise<Producer> {
  if (MODE === "api")
    return apiRequest(
      ProducerSchema,
      `/admin/producers/${encodeURIComponent(input.id || "new")}`,
      { method: "PUT", body: JSON.stringify(input) },
      { auth: true }
    );

  const db = readDb();
  const isNew = !input.id || !db.producers.some((p) => p.id === input.id);
  const id = isNew ? newId() : input.id;

  if (!db.zones.some((z0) => z0.id === input.zoneId))
    throw new Error("Zona non valida.");
  if (slugTaken(db.producers, input.slug, isNew ? undefined : id))
    throw new Error("Slug già in uso per un’azienda.");

  const createdAt = isNew
    ? now()
    : db.producers.find((x) => x.id === id)?.createdAt || now();

  const producer: Producer = ProducerSchema.parse({
    ...input,
    id,
    location: input.location ?? null,
    website: input.website ?? null,
    instagram: input.instagram ?? null,
    coverImageUrl: input.coverImageUrl ?? null,
    createdAt,
    updatedAt: now(),
  });

  const next = isNew
    ? [producer, ...db.producers]
    : db.producers.map((x) => (x.id === id ? producer : x));
  writeDb({ ...db, producers: next });
  mutate("admin:producers");
  return producer;
}

export async function adminDeleteProducer(id: string): Promise<void> {
  if (MODE === "api") {
    await apiRequest(
      z.object({ ok: z.literal(true) }),
      `/admin/producers/${encodeURIComponent(id)}`,
      { method: "DELETE" },
      { auth: true }
    );
    return;
  }

  const db = readDb();
  const hasWines = db.wines.some((w) => w.producerId === id);
  if (hasWines)
    throw new Error(
      "Impossibile eliminare: esistono vini collegati a questa azienda."
    );

  writeDb({ ...db, producers: db.producers.filter((x) => x.id !== id) });
  mutate("admin:producers");
}

export async function adminListWines(): Promise<Wine[]> {
  if (MODE === "api")
    return apiRequest(z.array(WineSchema), "/admin/wines", undefined, {
      auth: true,
    });
  return readDb().wines;
}

export async function adminGetWine(id: string): Promise<Wine> {
  if (MODE === "api")
    return apiRequest(
      WineSchema,
      `/admin/wines/${encodeURIComponent(id)}`,
      undefined,
      {
        auth: true,
      }
    );
  const w = readDb().wines.find((x) => x.id === id);
  if (!w) throw new Error("Vino non trovato");
  return w;
}

export async function adminUpsertWine(
  input: Omit<Wine, "createdAt" | "updatedAt"> & { createdAt?: string }
): Promise<Wine> {
  if (MODE === "api")
    return apiRequest(
      WineSchema,
      `/admin/wines/${encodeURIComponent(input.id || "new")}`,
      { method: "PUT", body: JSON.stringify(input) },
      { auth: true }
    );

  const db = readDb();
  const isNew = !input.id || !db.wines.some((w) => w.id === input.id);
  const id = isNew ? newId() : input.id;

  if (!db.producers.some((p) => p.id === input.producerId))
    throw new Error("Azienda non valida.");
  if (slugTaken(db.wines, input.slug, isNew ? undefined : id))
    throw new Error("Slug già in uso per un vino.");
  WineTypeSchema.parse(input.type);

  const createdAt = isNew
    ? now()
    : db.wines.find((x) => x.id === id)?.createdAt || now();

  const wine: Wine = WineSchema.parse({
    ...input,
    id,
    vintage: input.vintage ?? null,
    grapes: input.grapes ?? null,
    alcohol: input.alcohol ?? null,
    vinification: input.vinification ?? null,
    tastingNotes: input.tastingNotes ?? null,
    pairing: input.pairing ?? null,
    priceCents: input.priceCents ?? null,
    bottleSizeMl: input.bottleSizeMl ?? null,
    imageUrl: input.imageUrl ?? null,
    isAvailable: !!input.isAvailable,
    createdAt,
    updatedAt: now(),
  });

  const next = isNew
    ? [wine, ...db.wines]
    : db.wines.map((x) => (x.id === id ? wine : x));
  writeDb({ ...db, wines: next });
  mutate("admin:wines");
  return wine;
}

export async function adminDeleteWine(id: string): Promise<void> {
  if (MODE === "api") {
    await apiRequest(
      z.object({ ok: z.literal(true) }),
      `/admin/wines/${encodeURIComponent(id)}`,
      { method: "DELETE" },
      { auth: true }
    );
    return;
  }

  const db = readDb();
  writeDb({ ...db, wines: db.wines.filter((x) => x.id !== id) });
  mutate("admin:wines");
}

export async function adminGetHome(): Promise<HomeContent> {
  if (MODE === "api")
    return apiRequest(HomeContentSchema, "/admin/home", undefined, {
      auth: true,
    });
  return readDb().home;
}

export async function adminUpdateHome(
  input: HomeContent
): Promise<HomeContent> {
  if (MODE === "api")
    return apiRequest(
      HomeContentSchema,
      "/admin/home",
      { method: "PUT", body: JSON.stringify(input) },
      { auth: true }
    );

  const db = readDb();
  const next = HomeContentSchema.parse(input);
  writeDb({ ...db, home: next });
  mutate("admin:home");
  mutate("home");
  return next;
}

export async function adminGetSettings(): Promise<SiteSettings> {
  if (MODE === "api")
    return apiRequest(SiteSettingsSchema, "/admin/settings", undefined, {
      auth: true,
    });
  return readDb().settings;
}

export async function adminUpdateSettings(
  input: SiteSettings
): Promise<SiteSettings> {
  if (MODE === "api")
    return apiRequest(
      SiteSettingsSchema,
      "/admin/settings",
      { method: "PUT", body: JSON.stringify(input) },
      { auth: true }
    );

  const db = readDb();
  const next = SiteSettingsSchema.parse(input);
  writeDb({ ...db, settings: next });
  mutate("admin:settings");
  mutate("settings");
  return next;
}

export function useAdminZones() {
  return useSWR("admin:zones", adminListZones);
}

export function useAdminZone(id: string | undefined) {
  return useSWR(id ? `admin:zone:${id}` : null, () => adminGetZone(id!));
}

export function useAdminProducers() {
  return useSWR("admin:producers", adminListProducers);
}

export function useAdminProducer(id: string | undefined) {
  return useSWR(id ? `admin:producer:${id}` : null, () =>
    adminGetProducer(id!)
  );
}

export function useAdminWines() {
  return useSWR("admin:wines", adminListWines);
}

export function useAdminWine(id: string | undefined) {
  return useSWR(id ? `admin:wine:${id}` : null, () => adminGetWine(id!));
}

export function useAdminHome() {
  return useSWR("admin:home", adminGetHome);
}

export function useAdminSettings() {
  return useSWR("admin:settings", adminGetSettings);
}

export function wineTypeOptions(): Array<{ value: WineType; label: string }> {
  const list: WineType[] = [
    "white",
    "red",
    "rose",
    "orange",
    "sparkling",
    "other",
  ];
  const label = (t: WineType) =>
    t === "white"
      ? "Bianco"
      : t === "red"
      ? "Rosso"
      : t === "rose"
      ? "Rosé"
      : t === "orange"
      ? "Orange"
      : t === "sparkling"
      ? "Spumante"
      : "Altro";
  return list.map((v) => ({ value: v, label: label(v) }));
}
