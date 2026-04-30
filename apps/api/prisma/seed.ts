import "dotenv/config";
import { PrismaClient, WineType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function upsertSingletons() {
  // ── Admin User ──────────────────────
  // Crea l'admin SOLO se non esiste già nel DB.
  // La password viene presa dalla env var ADMIN_PASSWORD e hashata con bcrypt.
  // Dopo il primo seed, la password vive SOLO nel DB (hashata).
  // Se l'admin esiste già, NON sovrascrive la password
  // (così il cambio password dall'admin panel persiste tra i deploy).
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@example.com").trim();
  const adminPassword = process.env.ADMIN_PASSWORD || "changeme123";

  const DEMO_EMAILS = ["admin@example.com", "admin@impronta.local"];
  if (!DEMO_EMAILS.includes(adminEmail)) {
    const deleted = await prisma.adminUser.deleteMany({
      where: { email: { in: DEMO_EMAILS } },
    });
    if (deleted.count > 0) console.log(`Utenze demo rimosse: ${deleted.count}`);
  }

  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hash = await bcrypt.hash(adminPassword, 12);
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        passwordHash: hash,
      },
    });
    console.log(`Admin creato: ${adminEmail}`);
  } else {
    console.log(
      `Admin già esistente: ${adminEmail} — password NON sovrascritta`,
    );
  }

  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      contactEmail: "info@impronta.example",
      phone: null,
      address: "Roma, Italia",
      hours: "Lun–Ven 10:00–18:00",
      socials: { instagram: "", website: "", whatsapp: "" },
    },
  });

  await prisma.homeContent.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      heroImageUrl: null,
      heroQuote:
        "Una selezione essenziale. Territori, persone, vini. Senza rumore.",
      story:
        "Impronta nasce per dare ritmo e contesto: una mappa editoriale di zone e aziende agricole, raccontate con parole misurate e informazioni utili.",
      vision:
        "Crediamo nella trasparenza: dati chiari, storie sincere, e un’estetica che lascia spazio al contenuto.",
      mission:
        "Mettere in relazione territorio e lavoro umano, offrendo un catalogo da consultare con calma, per scegliere meglio.",
      featuredZoneIds: [],
      featuredProducerIds: [],
      featuredWineIds: [],
    },
  });
}

async function main() {
  await upsertSingletons();

  const zonesInput = [
    { country: "Spagna", region: "Catalunya", name: "Penedès" },
    { country: "Spagna", region: "Baleari", name: "Mallorca" },
    { country: "Francia", region: "Sud Francia", name: "Languedoc" },
    { country: "Francia", region: "Sud Francia", name: "Roussillon" },
    { country: "Italia", region: "Piemonte", name: "Langhe" },
  ];

  const zones = await Promise.all(
    zonesInput.map((z) =>
      prisma.zone.upsert({
        where: { slug: slugify(`${z.country}-${z.region}-${z.name}`) },
        update: {
          name: z.name,
          country: z.country,
          region: z.region,
        },
        create: {
          name: z.name,
          slug: slugify(`${z.country}-${z.region}-${z.name}`),
          country: z.country,
          region: z.region,
          descriptionShort:
            "Un territorio da leggere con attenzione, tra suoli e microclimi.",
          descriptionLong:
            "Una zona che vale la pena osservare con calma: geologia, esposizioni, altitudini e un mosaico di pratiche agricole che cambiano da collina a collina.",
          coverImageUrl: null,
        },
      }),
    ),
  );

  const zoneByKey = (country: string, region: string, name: string) => {
    const slug = slugify(`${country}-${region}-${name}`);
    const zone = zones.find((x) => x.slug === slug);
    if (!zone) throw new Error(`Zona mancante: ${slug}`);
    return zone;
  };

  const producersInput = [
    {
      zone: zoneByKey("Spagna", "Catalunya", "Penedès"),
      name: "Mas Candi",
      philosophyShort:
        "Vigne vive, interventi minimi, precisione nei dettagli.",
      storyLong:
        "Una ricerca paziente tra parcelle e fermentazioni: l’obiettivo è mettere a fuoco il carattere del luogo, senza sovrapporre stile.",
      location: "Penedès, Catalunya",
      website: null,
      instagram: null,
    },
    {
      zone: zoneByKey("Spagna", "Catalunya", "Penedès"),
      name: "Bodega Clandestina",
      philosophyShort: "Spontaneo e diretto, con una mano leggera.",
      storyLong:
        "Una cantina che lavora per sottrazione: fermentazioni spontanee, macerazioni misurate, e un registro sempre asciutto.",
      location: "Penedès, Catalunya",
      website: null,
      instagram: null,
    },
    {
      zone: zoneByKey("Spagna", "Baleari", "Mallorca"),
      name: "Panduro",
      philosophyShort: "Una lettura mediterranea: sole, vento, tensione.",
      storyLong:
        "A Mallorca, la viticoltura ha un passo diverso: qui la sfida è tenere insieme maturità e verticalità.",
      location: "Mallorca, Baleari",
      website: null,
      instagram: null,
    },
    {
      zone: zoneByKey("Francia", "Sud Francia", "Languedoc"),
      name: "Chai Uva",
      philosophyShort: "Tessitura fine, estrazioni contenute, equilibrio.",
      storyLong:
        "Un progetto che cerca coerenza tra annate: stessa idea, ascolto diverso. Ogni vendemmia aggiusta la mano.",
      location: "Languedoc, Francia",
      website: null,
      instagram: null,
    },
    {
      zone: zoneByKey("Francia", "Sud Francia", "Roussillon"),
      name: "Ausseil",
      philosophyShort: "Terreni aspri, vini di energia e sale.",
      storyLong:
        "Il Roussillon chiede rispetto: maturità rapida e contrasti. Qui si lavora per tenere la linea e non perdere il centro.",
      location: "Roussillon, Francia",
      website: null,
      instagram: null,
    },
    {
      zone: zoneByKey("Italia", "Piemonte", "Langhe"),
      name: "Borgogno-Rivata",
      philosophyShort: "Lentezza, pulizia, e una classicità non nostalgica.",
      storyLong:
        "In Langa il tempo è un ingrediente. L’obiettivo non è stupire, ma costruire profondità e leggibilità nel bicchiere.",
      location: "Langhe, Piemonte",
      website: null,
      instagram: null,
    },
  ];

  const producers = await Promise.all(
    producersInput.map((p) =>
      prisma.producer.upsert({
        where: { slug: slugify(p.name) },
        update: {
          name: p.name,
          philosophyShort: p.philosophyShort,
          storyLong: p.storyLong,
          zoneId: p.zone.id,
          location: p.location,
          website: p.website,
          instagram: p.instagram,
        },
        create: {
          zoneId: p.zone.id,
          name: p.name,
          slug: slugify(p.name),
          philosophyShort: p.philosophyShort,
          storyLong: p.storyLong,
          location: p.location,
          website: p.website,
          instagram: p.instagram,
          coverImageUrl: null,
        },
      }),
    ),
  );

  const producerByName = (name: string) => {
    const p = producers.find((x) => x.name === name);
    if (!p) throw new Error(`Producer mancante: ${name}`);
    return p;
  };

  const winesInput: Array<{
    producer: string;
    name: string;
    vintage?: number;
    type: WineType;
  }> = [
    { producer: "Mas Candi", name: "Tinc Set", vintage: 2024, type: "white" },
    { producer: "Mas Candi", name: "Baudili Blanc", type: "white" },
    { producer: "Bodega Clandestina", name: "Soci", type: "red" },
    { producer: "Bodega Clandestina", name: "Sense papers", type: "orange" },
    { producer: "Panduro", name: "Quarto", type: "white" },
    { producer: "Panduro", name: "Quarterada", type: "white" },
    { producer: "Chai Uva", name: "Macarello", type: "red" },
    { producer: "Chai Uva", name: "Herr muller", type: "white" },
    { producer: "Ausseil", name: "Piaf Rouge", type: "red" },
    { producer: "Ausseil", name: "Alouette", type: "white" },
    { producer: "Borgogno-Rivata", name: "Nebbiolo", type: "red" },
    { producer: "Borgogno-Rivata", name: "Barolo", type: "red" },
  ];

  const wines = await Promise.all(
    winesInput.map((w) => {
      const producer = producerByName(w.producer);
      const slug = slugify(
        `${producer.slug}-${w.name}${w.vintage ? `-${w.vintage}` : ""}`,
      );
      return prisma.wine.upsert({
        where: { slug },
        // Non sovrascrivere dati compilati dall'admin (immagini, prezzi, note, ecc.)
        update: {
          name: w.name,
          vintage: w.vintage ?? null,
          type: w.type,
          producerId: producer.id,
        },
        create: {
          producerId: producer.id,
          name: w.name,
          slug,
          vintage: w.vintage ?? null,
          type: w.type,
          grapes: null,
          alcohol: null,
          vinification: null,
          tastingNotes: null,
          pairing: null,
          priceCents: null,
          isAvailable: true,
          bottleSizeMl: 750,
          imageUrl: null,
        },
      });
    }),
  );

  // Imposta i featured solo se l'admin non li ha ancora configurati
  const currentHome = await prisma.homeContent.findUnique({ where: { id: 1 } });
  if (currentHome && currentHome.featuredZoneIds.length === 0) {
    await prisma.homeContent.update({
      where: { id: 1 },
      data: { featuredZoneIds: zones.slice(0, 3).map((z) => z.id) },
    });
  }
  if (currentHome && currentHome.featuredProducerIds.length === 0) {
    await prisma.homeContent.update({
      where: { id: 1 },
      data: { featuredProducerIds: producers.slice(0, 6).map((p) => p.id) },
    });
  }

  await prisma.$disconnect();
  void wines;
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
