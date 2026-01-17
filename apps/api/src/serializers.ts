import type {
  HomeContent,
  Producer,
  SiteSettings,
  Wine,
  Zone,
} from "@prisma/client";

export function toIso<T extends { createdAt: Date; updatedAt: Date }>(x: T) {
  return {
    ...x,
    createdAt: x.createdAt.toISOString(),
    updatedAt: x.updatedAt.toISOString(),
  };
}

export function zoneOut(z: Zone) {
  return { ...toIso(z), coverImageUrl: z.coverImageUrl ?? null };
}

export function producerOut(p: Producer) {
  return {
    ...toIso(p),
    location: p.location ?? null,
    website: p.website ?? null,
    instagram: p.instagram ?? null,
    coverImageUrl: p.coverImageUrl ?? null,
  };
}

export function wineOut(w: Wine) {
  return {
    ...toIso(w),
    vintage: w.vintage ?? null,
    grapes: w.grapes ?? null,
    alcohol: w.alcohol ?? null,
    vinification: w.vinification ?? null,
    tastingNotes: w.tastingNotes ?? null,
    pairing: w.pairing ?? null,
    priceCents: w.priceCents ?? null,
    bottleSizeMl: w.bottleSizeMl ?? null,
    imageUrl: w.imageUrl ?? null,
  };
}

export function homeOut(h: HomeContent) {
  return {
    heroImageUrl: h.heroImageUrl ?? null,
    heroQuote: h.heroQuote,
    story: h.story,
    vision: h.vision,
    mission: h.mission,
    featuredZoneIds: h.featuredZoneIds,
    featuredProducerIds: h.featuredProducerIds,
  };
}

export function settingsOut(s: SiteSettings) {
  const socials = typeof s.socials === "object" && s.socials ? s.socials : {};
  return {
    contactEmail: s.contactEmail,
    phone: s.phone ?? null,
    address: s.address ?? null,
    hours: s.hours ?? null,
    socials: socials as Record<string, unknown>,
  };
}
