import useSWR, { mutate } from "swr";
import { z } from "zod";

import type {
  HomeContent,
  InventoryMovement,
  InventoryMovementInput,
  Producer,
  SiteSettings,
  Wine,
  WineType,
  Zone,
} from "../shared/types";

import {
  HomeContentSchema,
  InventoryMovementInputSchema,
  InventoryMovementSchema,
  ProducerSchema,
  SiteSettingsSchema,
  WineSchema,
  WineTypeSchema,
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

import { DATA_SOURCE as MODE } from "./config";
import { adminRequest, adminUploadRequest } from "../auth/adminApi";

/* =========================
   MOCK DB (localStorage)
   ========================= */

const KEY = "impronta_mock_db_v2";

const AdminDbSchema = z.object({
  zones: z.array(ZoneSchema),
  producers: z.array(ProducerSchema),
  wines: z.array(WineSchema),
  home: HomeContentSchema,
  settings: SiteSettingsSchema,
  movements: z.array(InventoryMovementSchema),
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
    movements: seedMovements,
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
  excludeId?: string,
) {
  return list.some((x) => x.slug === slug && x.id !== excludeId);
}

/* =========================
   ZONES
   ========================= */

export async function adminListZones(): Promise<Zone[]> {
  if (MODE === "api") {
    return adminRequest(z.array(ZoneSchema), "/admin/zones");
  }
  return readDb().zones;
}

export async function adminGetZone(id: string): Promise<Zone> {
  if (MODE === "api") {
    return adminRequest(ZoneSchema, `/admin/zones/${encodeURIComponent(id)}`);
  }
  const z0 = readDb().zones.find((x) => x.id === id);
  if (!z0) throw new Error("Zona non trovata");
  return z0;
}

export async function adminUpsertZone(
  input: Omit<Zone, "createdAt" | "updatedAt"> & { createdAt?: string },
): Promise<Zone> {
  if (MODE === "api") {
    const id = input.id || newId();
    const body = {
      name: input.name,
      slug: input.slug,
      country: input.country,
      region: input.region,
      descriptionShort: input.descriptionShort,
      descriptionLong: input.descriptionLong,
      coverImageUrl: input.coverImageUrl ?? null,
    };
    const result = await adminRequest(
      ZoneSchema,
      `/admin/zones/${encodeURIComponent(id)}`,
      { method: "PUT", body: JSON.stringify(body) },
    );
    mutate("admin:zones");
    return result;
  }

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
    await adminRequest(
      z.object({ ok: z.literal(true) }),
      `/admin/zones/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    mutate("admin:zones");
    return;
  }

  const db = readDb();
  const hasProducers = db.producers.some((p) => p.zoneId === id);
  if (hasProducers)
    throw new Error(
      "Impossibile eliminare: esistono aziende collegate a questa zona.",
    );

  writeDb({ ...db, zones: db.zones.filter((x) => x.id !== id) });
  mutate("admin:zones");
}

/* =========================
   PRODUCERS
   ========================= */

export async function adminListProducers(): Promise<Producer[]> {
  if (MODE === "api") {
    return adminRequest(z.array(ProducerSchema), "/admin/producers");
  }
  return readDb().producers;
}

export async function adminGetProducer(id: string): Promise<Producer> {
  if (MODE === "api") {
    return adminRequest(
      ProducerSchema,
      `/admin/producers/${encodeURIComponent(id)}`,
    );
  }
  const p = readDb().producers.find((x) => x.id === id);
  if (!p) throw new Error("Azienda non trovata");
  return p;
}

export async function adminUpsertProducer(
  input: Omit<Producer, "createdAt" | "updatedAt"> & { createdAt?: string },
): Promise<Producer> {
  if (MODE === "api") {
    const id = input.id || newId();
    const body = {
      zoneId: input.zoneId,
      name: input.name,
      slug: input.slug,
      philosophyShort: input.philosophyShort,
      storyLong: input.storyLong,
      location: input.location ?? null,
      website: input.website ?? null,
      instagram: input.instagram ?? null,
      coverImageUrl: input.coverImageUrl ?? null,
    };
    const result = await adminRequest(
      ProducerSchema,
      `/admin/producers/${encodeURIComponent(id)}`,
      { method: "PUT", body: JSON.stringify(body) },
    );
    mutate("admin:producers");
    return result;
  }

  const db = readDb();
  const isNew = !input.id || !db.producers.some((p) => p.id === input.id);
  const id = isNew ? newId() : input.id;

  if (!db.zones.some((z0) => z0.id === input.zoneId))
    throw new Error("Zona non valida.");
  if (slugTaken(db.producers, input.slug, isNew ? undefined : id))
    throw new Error("Slug già in uso per un'azienda.");

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
    await adminRequest(
      z.object({ ok: z.literal(true) }),
      `/admin/producers/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    mutate("admin:producers");
    return;
  }

  const db = readDb();
  const hasWines = db.wines.some((w) => w.producerId === id);
  if (hasWines)
    throw new Error(
      "Impossibile eliminare: esistono vini collegati a questa azienda.",
    );

  writeDb({ ...db, producers: db.producers.filter((x) => x.id !== id) });
  mutate("admin:producers");
}

/* =========================
   WINES
   ========================= */

export async function adminListWines(): Promise<Wine[]> {
  if (MODE === "api") {
    return adminRequest(z.array(WineSchema), "/admin/wines");
  }
  return readDb().wines;
}

export async function adminGetWine(id: string): Promise<Wine> {
  if (MODE === "api") {
    return adminRequest(WineSchema, `/admin/wines/${encodeURIComponent(id)}`);
  }
  const w = readDb().wines.find((x) => x.id === id);
  if (!w) throw new Error("Vino non trovato");
  return w;
}

export async function adminUpsertWine(
  input: Omit<Wine, "createdAt" | "updatedAt"> & { createdAt?: string },
): Promise<Wine> {
  if (MODE === "api") {
    const id = input.id || newId();
    const body = {
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
      isAvailable: !!input.isAvailable,
      bottleSizeMl: input.bottleSizeMl ?? null,
      imageUrl: input.imageUrl ?? null,
    };
    const result = await adminRequest(
      WineSchema,
      `/admin/wines/${encodeURIComponent(id)}`,
      { method: "PUT", body: JSON.stringify(body) },
    );
    mutate("admin:wines");
    return result;
  }

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
    await adminRequest(
      z.object({ ok: z.literal(true) }),
      `/admin/wines/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    mutate("admin:wines");
    return;
  }

  const db = readDb();
  writeDb({ ...db, wines: db.wines.filter((x) => x.id !== id) });
  mutate("admin:wines");
}

/* =========================
   HOME
   ========================= */

export async function adminGetHome(): Promise<HomeContent> {
  if (MODE === "api") {
    return adminRequest(HomeContentSchema, "/admin/home");
  }
  return readDb().home;
}

export async function adminUpdateHome(
  input: HomeContent,
): Promise<HomeContent> {
  if (MODE === "api") {
    const result = await adminRequest(HomeContentSchema, "/admin/home", {
      method: "PUT",
      body: JSON.stringify(input),
    });
    mutate("admin:home");
    mutate("home");
    return result;
  }

  const db = readDb();
  const next = HomeContentSchema.parse(input);
  writeDb({ ...db, home: next });
  mutate("admin:home");
  mutate("home");
  return next;
}

/* =========================
   SETTINGS (API ONLY when MODE==="api")
   ========================= */

export async function adminGetSettings(): Promise<SiteSettings> {
  if (MODE === "api")
    return adminRequest(SiteSettingsSchema, "/admin/settings");
  return readDb().settings;
}

export async function adminUpdateSettings(
  input: SiteSettings,
): Promise<SiteSettings> {
  if (MODE === "api") {
    return adminRequest(SiteSettingsSchema, "/admin/settings", {
      method: "PUT",
      body: JSON.stringify(input),
    });
  }

  const db = readDb();
  const next = SiteSettingsSchema.parse(input);
  writeDb({ ...db, settings: next });
  mutate("admin:settings");
  mutate("settings");
  return next;
}

/* =========================
   CONTACT LEADS (API ONLY when MODE==="api")
   ========================= */

const ContactLeadSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable(),
  subject: z.string().min(1),
  message: z.string().min(1),
  createdAt: z.string().min(1),
});

export type AdminContactLead = z.infer<typeof ContactLeadSchema>;

function readMockLeads(): AdminContactLead[] {
  const raw = localStorage.getItem("impronta_contact_leads");
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x: any, i: number) => {
        const createdAt = String(x?.createdAt || now());
        return {
          id: String(x?.id || `mock_${i}_${createdAt}`),
          name: String(x?.name || ""),
          email: String(x?.email || ""),
          phone: x?.phone == null ? null : String(x.phone),
          subject: String(x?.subject || ""),
          message: String(x?.message || ""),
          createdAt,
        };
      })
      .filter((x) => x.name && x.email && x.subject && x.message);
  } catch {
    return [];
  }
}

export async function adminListContactLeads(): Promise<AdminContactLead[]> {
  if (MODE === "api") {
    return adminRequest(z.array(ContactLeadSchema), "/admin/contact-leads");
  }
  return readMockLeads().slice(0, 200);
}

export async function adminDeleteContactLead(id: string): Promise<void> {
  if (MODE === "api") {
    await adminRequest(
      z.object({ ok: z.literal(true) }),
      `/admin/contact-leads/${id}`,
      {
        method: "DELETE",
      },
    );
    await mutate("admin:contact-leads");
    return;
  }
  // mock: remove from localStorage
  const leads = readMockLeads().filter((l) => l.id !== id);
  localStorage.setItem("impronta_contact_leads", JSON.stringify(leads));
  await mutate("admin:contact-leads");
}

export async function adminChangePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (MODE === "api") {
    await adminRequest(
      z.object({ ok: z.literal(true) }),
      "/admin/change-password",
      {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      },
    );
    return;
  }
  // mock: no-op
  throw new Error("Cambio password disponibile solo con backend API.");
}

/* =========================
   SWR HOOKS
   ========================= */

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
    adminGetProducer(id!),
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
export function useAdminContactLeads() {
  return useSWR("admin:contact-leads", adminListContactLeads);
}

/* =========================
   INVENTORY MOVEMENTS
   ========================= */

export function calculateStock(
  movements: InventoryMovement[],
  wineId: string,
): number {
  return movements
    .filter((m) => m.wineId === wineId)
    .reduce((acc, m) => {
      if (m.type === "in") return acc + m.quantity;
      if (m.type === "out") return acc - m.quantity;
      return acc + m.quantity; // adjustment (può essere negativo)
    }, 0);
}

export async function adminListMovements(): Promise<InventoryMovement[]> {
  if (MODE === "api") {
    return adminRequest(
      z.array(InventoryMovementSchema),
      "/admin/inventory",
    );
  }
  return [...readDb().movements].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function adminCreateMovement(
  input: InventoryMovementInput,
): Promise<InventoryMovement> {
  if (MODE === "api") {
    return adminRequest(InventoryMovementSchema, "/admin/inventory", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
  const parsed = InventoryMovementInputSchema.parse(input);
  const db = readDb();
  const movement: InventoryMovement = {
    ...parsed,
    id: newId(),
    createdAt: now(),
    updatedAt: now(),
  };
  db.movements.push(movement);
  writeDb(db);
  return movement;
}

export async function adminUpdateMovement(
  id: string,
  input: InventoryMovementInput,
): Promise<InventoryMovement> {
  if (MODE === "api") {
    return adminRequest(
      InventoryMovementSchema,
      `/admin/inventory/${encodeURIComponent(id)}`,
      { method: "PUT", body: JSON.stringify(input) },
    );
  }
  const parsed = InventoryMovementInputSchema.parse(input);
  const db = readDb();
  const idx = db.movements.findIndex((m) => m.id === id);
  if (idx === -1) throw new Error("Movimento non trovato");
  db.movements[idx] = { ...db.movements[idx], ...parsed, updatedAt: now() };
  writeDb(db);
  return db.movements[idx];
}

export async function adminDeleteMovement(id: string): Promise<void> {
  if (MODE === "api") {
    await adminRequest(z.unknown(), `/admin/inventory/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return;
  }
  const db = readDb();
  db.movements = db.movements.filter((m) => m.id !== id);
  writeDb(db);
}

export function useAdminMovements() {
  return useSWR("admin:movements", adminListMovements);
}

export type ExtractedInvoiceLine = {
  wineName: string;
  wineId: string | null;
  quantity: number;
  unitPriceCents: number | null;
  notes: string | null;
};

export type ExtractedInvoice = {
  type: InventoryMovement["type"];
  invoiceNumber: string | null;
  invoiceDate: string | null;
  supplierOrCustomer: string | null;
  invoiceFileUrl: string | null;
  lines: ExtractedInvoiceLine[];
};

const ExtractedInvoiceSchema = z.object({
  type: z.enum(["in", "out", "adjustment"]),
  invoiceNumber: z.string().nullable(),
  invoiceDate: z.string().nullable(),
  supplierOrCustomer: z.string().nullable(),
  invoiceFileUrl: z.string().nullable(),
  lines: z.array(z.object({
    wineName: z.string(),
    wineId: z.string().nullable().optional(),
    quantity: z.number(),
    unitPriceCents: z.number().nullable(),
    notes: z.string().nullable(),
  })).min(1),
});

export async function adminExtractInvoice(file: File): Promise<ExtractedInvoice> {
  if (MODE === "api") {
    const fd = new FormData();
    fd.append("file", file);
    return adminUploadRequest(ExtractedInvoiceSchema, "/admin/inventory/extract", fd);
  }

  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (geminiKey) {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    const base64 = btoa(binary);

    const ownerName = (import.meta.env.VITE_OWNER_NAME as string | undefined) ?? "il titolare";
    const PROMPT = `Analizza questa fattura o documento commerciale ed estrai i dati strutturati.

CONTESTO: il titolare di questo sistema è "${ownerName}". Determina il tipo dal suo punto di vista:
- "in" se la fattura è emessa da un fornitore VERSO ${ownerName} (acquisto, bottiglie in entrata)
- "out" se la fattura è emessa DA ${ownerName} verso un cliente (vendita, bottiglie in uscita)

Restituisci SOLO un oggetto JSON valido (nessun testo aggiuntivo, nessun markdown):
{
  "type": "in" oppure "out" come descritto sopra,
  "invoiceNumber": "numero fattura o DDT" (null se assente),
  "invoiceDate": "data in formato YYYY-MM-DD" (null se assente),
  "supplierOrCustomer": "ragione sociale del fornitore se type=in, oppure del cliente se type=out" (null se assente),
  "lines": [
    {
      "wineName": "nome completo del vino con annata se presente",
      "quantity": numero intero di bottiglie,
      "unitPriceCents": prezzo unitario NETTO in centesimi dopo eventuali sconti (intero, null se assente),
      "notes": "eventuali note: gradazione, lotto, codice" (null se assente)
    }
  ]
}
REGOLE: includi SOLO vini/bevande alcoliche. Escludi KEG, imballi, trasporti. La quantità è in bottiglie.`;

    const result = await model.generateContent([
      { inlineData: { mimeType: file.type, data: base64 } },
      PROMPT,
    ]);

    const raw = result.response.text().trim()
      .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

    const parsed = JSON.parse(raw);
    return ExtractedInvoiceSchema.parse({ ...parsed, invoiceFileUrl: null });
  }

  // Mock: dati finti
  await new Promise((r) => setTimeout(r, 1200));
  return {
    type: "in",
    invoiceNumber: `FT-MOCK-${Date.now().toString().slice(-4)}`,
    invoiceDate: new Date().toISOString().slice(0, 10),
    supplierOrCustomer: "Fornitore Mock Srl",
    invoiceFileUrl: null,
    lines: [
      { wineName: "Tinc Set 2024", quantity: 12, unitPriceCents: 750, notes: null },
      { wineName: "Baudili Orange 2025", quantity: 6, unitPriceCents: 800, notes: null },
      { wineName: "Baudili Blanc 2024", quantity: 6, unitPriceCents: 725, notes: null },
    ],
  };
}

export function useAdminWineStock(wineId: string | undefined) {
  return useSWR(
    wineId ? `admin:stock:${wineId}` : null,
    async () => {
      const all = await adminListMovements();
      return calculateStock(all, wineId!);
    },
  );
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
