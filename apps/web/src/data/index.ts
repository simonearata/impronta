import useSWR from "swr";
import { z } from "zod";
import {
  HomeContentSchema,
  ProducerDetailSchema,
  ProducerSchema,
  SiteSettingsSchema,
  WineDetailSchema,
  WineSchema,
  ZoneDetailSchema,
  ZoneSchema,
} from "../shared/schemas";
import type {
  HomeContent,
  Producer,
  ProducerDetail,
  SiteSettings,
  Wine,
  WineDetail,
  WineType,
  Zone,
  ZoneDetail,
} from "../shared/types";
import { readDb } from "./mockDb";
import { DATA_SOURCE } from "./config";
import { apiRequest } from "./api";

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  return schema.parse(input);
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type ListZonesParams = { country?: string; region?: string; q?: string };
type ListProducersParams = { zone?: string; q?: string };
type ListWinesParams = {
  zone?: string;
  producer?: string;
  type?: WineType;
  vintage?: string;
  q?: string;
};

function includesQ(s: string, q: string) {
  return s.toLowerCase().includes(q.toLowerCase());
}

function zoneById(db: ReturnType<typeof readDb>, zoneId: string) {
  return db.zones.find((z0) => z0.id === zoneId) || null;
}

function producerById(db: ReturnType<typeof readDb>, producerId: string) {
  return db.producers.find((p) => p.id === producerId) || null;
}

export async function getHome(): Promise<HomeContent> {
  if (DATA_SOURCE === "api") return apiRequest(HomeContentSchema, "/home");
  await delay(120);
  return parse(HomeContentSchema, readDb().home);
}

export async function getSettings(): Promise<SiteSettings> {
  if (DATA_SOURCE === "api") return apiRequest(SiteSettingsSchema, "/settings");
  await delay(120);
  return parse(SiteSettingsSchema, readDb().settings);
}

export async function listZones(params: ListZonesParams): Promise<Zone[]> {
  if (DATA_SOURCE === "api") {
    const qs = new URLSearchParams();
    if (params.country) qs.set("country", params.country);
    if (params.region) qs.set("region", params.region);
    if (params.q) qs.set("q", params.q);
    return apiRequest(z.array(ZoneSchema), `/zones?${qs.toString()}`);
  }

  await delay(180);
  const db = readDb();
  const q = params.q?.trim();

  const out = db.zones.filter((z0) => {
    if (params.country && z0.country !== params.country) return false;
    if (params.region && z0.region !== params.region) return false;
    if (q && !includesQ(z0.name, q)) return false;
    return true;
  });

  return parse(z.array(ZoneSchema), out);
}

export async function getZoneDetail(slug: string): Promise<ZoneDetail> {
  if (DATA_SOURCE === "api")
    return apiRequest(ZoneDetailSchema, `/zones/${encodeURIComponent(slug)}`);

  await delay(200);
  const db = readDb();
  const zone = db.zones.find((z0) => z0.slug === slug);
  if (!zone) throw new Error("Zona non trovata");
  const producers = db.producers.filter((p) => p.zoneId === zone.id);
  return parse(ZoneDetailSchema, { zone, producers });
}

export async function listProducers(
  params: ListProducersParams,
): Promise<Producer[]> {
  if (DATA_SOURCE === "api") {
    const qs = new URLSearchParams();
    if (params.zone) qs.set("zone", params.zone);
    if (params.q) qs.set("q", params.q);
    return apiRequest(z.array(ProducerSchema), `/producers?${qs.toString()}`);
  }

  await delay(180);
  const db = readDb();
  const zoneId = params.zone
    ? db.zones.find((z0) => z0.slug === params.zone)?.id || null
    : null;
  const q = params.q?.trim();

  const out = db.producers.filter((p) => {
    if (zoneId && p.zoneId !== zoneId) return false;
    if (q && !includesQ(p.name, q)) return false;
    return true;
  });

  return parse(z.array(ProducerSchema), out);
}

export async function getProducerDetail(slug: string): Promise<ProducerDetail> {
  if (DATA_SOURCE === "api")
    return apiRequest(
      ProducerDetailSchema,
      `/producers/${encodeURIComponent(slug)}`,
    );

  await delay(220);
  const db = readDb();
  const producer = db.producers.find((p) => p.slug === slug);
  if (!producer) throw new Error("Azienda non trovata");
  const zone = zoneById(db, producer.zoneId);
  if (!zone) throw new Error("Zona mancante");
  const wines = db.wines.filter((w) => w.producerId === producer.id);
  return parse(ProducerDetailSchema, { producer, zone, wines });
}

export async function listWines(params: ListWinesParams): Promise<Wine[]> {
  if (DATA_SOURCE === "api") {
    const qs = new URLSearchParams();
    if (params.zone) qs.set("zone", params.zone);
    if (params.producer) qs.set("producer", params.producer);
    if (params.type) qs.set("type", params.type);
    if (params.vintage) qs.set("vintage", params.vintage);
    if (params.q) qs.set("q", params.q);
    return apiRequest(z.array(WineSchema), `/wines?${qs.toString()}`);
  }

  await delay(220);
  const db = readDb();
  const zoneId = params.zone
    ? db.zones.find((z0) => z0.slug === params.zone)?.id || null
    : null;
  const producerId = params.producer
    ? db.producers.find((p) => p.slug === params.producer)?.id || null
    : null;
  const q = params.q?.trim();
  const vintage = params.vintage?.trim();

  const out = db.wines.filter((w) => {
    if (producerId && w.producerId !== producerId) return false;

    if (zoneId) {
      const p = producerById(db, w.producerId);
      if (!p || p.zoneId !== zoneId) return false;
    }

    if (params.type && w.type !== params.type) return false;

    if (vintage) {
      const v = Number(vintage);
      if (!Number.isFinite(v)) return false;
      if ((w.vintage || null) !== v) return false;
    }

    if (q && !includesQ(w.name, q)) return false;

    return true;
  });

  return parse(z.array(WineSchema), out);
}

export async function getWineDetail(slug: string): Promise<WineDetail> {
  if (DATA_SOURCE === "api")
    return apiRequest(WineDetailSchema, `/wines/${encodeURIComponent(slug)}`);

  await delay(200);
  const db = readDb();
  const wine = db.wines.find((w) => w.slug === slug);
  if (!wine) throw new Error("Vino non trovato");
  const producer = producerById(db, wine.producerId);
  if (!producer) throw new Error("Azienda mancante");
  const zone = zoneById(db, producer.zoneId);
  if (!zone) throw new Error("Zona mancante");
  return parse(WineDetailSchema, { wine, producer, zone });
}

export function useHome() {
  return useSWR("home", getHome);
}

export function useSettings() {
  return useSWR("settings", getSettings);
}

export function useZones(params: ListZonesParams) {
  const key = `zones:${JSON.stringify(params)}`;
  return useSWR(key, () => listZones(params));
}

export function useZoneDetail(slug: string | undefined) {
  const key = slug ? `zone:${slug}` : null;
  return useSWR(key, () => getZoneDetail(slug!));
}

export function useProducers(params: ListProducersParams) {
  const key = `producers:${JSON.stringify(params)}`;
  return useSWR(key, () => listProducers(params));
}

export function useProducerDetail(slug: string | undefined) {
  const key = slug ? `producer:${slug}` : null;
  return useSWR(key, () => getProducerDetail(slug!));
}

export function useWines(params: ListWinesParams) {
  const key = `wines:${JSON.stringify(params)}`;
  return useSWR(key, () => listWines(params));
}

export function useWineDetail(slug: string | undefined) {
  const key = slug ? `wine:${slug}` : null;
  return useSWR(key, () => getWineDetail(slug!));
}
