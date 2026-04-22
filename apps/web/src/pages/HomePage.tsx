import { useRef } from "react";
import { Link } from "react-router-dom";
import { Container } from "../components/Container";
import { Meta } from "../components/Meta";
import { Skeleton } from "../components/Skeleton";
import { useHome, useProducers, useWines, useZones } from "../data";
import type { Zone, Producer, Wine } from "../shared/types";

function pickByIds<T extends { id: string }>(items: T[], ids: string[]) {
  const map = new Map(items.map((x) => [x.id, x] as const));
  return ids.map((id) => map.get(id)).filter(Boolean) as T[];
}

const wineTypeBg: Record<string, string> = {
  white: "bg-amber-50",
  red: "bg-red-100",
  orange: "bg-orange-100",
  rosé: "bg-pink-100",
  sparkling: "bg-stone-100",
};

const wineTypeLabel: Record<string, string> = {
  white: "Bianco",
  red: "Rosso",
  orange: "Orange",
  rosé: "Rosé",
  sparkling: "Spumante",
};

export function HomePage() {
  const home = useHome();
  const zones = useZones({});
  const producers = useProducers({});
  const wines = useWines({});
  const wineScrollRef = useRef<HTMLDivElement>(null);

  const allZones = zones.data || [];
  const allProducers = producers.data || [];
  const allWines = wines.data || [];

  const featuredZoneIds = home.data?.featuredZoneIds || [];
  const featuredProducerIds = home.data?.featuredProducerIds || [];
  const featuredWineIds = home.data?.featuredWineIds || [];

  const pickedZones = featuredZoneIds.length
    ? pickByIds(allZones, featuredZoneIds)
    : [];
  const pickedProducers = featuredProducerIds.length
    ? pickByIds(allProducers, featuredProducerIds)
    : [];

  const featuredZones = pickedZones.length ? pickedZones : allZones.slice(0, 3);
  const featuredProducers = pickedProducers.length
    ? pickedProducers
    : allProducers;

  const pickedWines = featuredWineIds.length
    ? pickByIds(allWines, featuredWineIds)
    : [];
  const featuredWines = pickedWines.length ? pickedWines : allWines;

  function scrollWines(dir: number) {
    wineScrollRef.current?.scrollBy({ left: dir * 220, behavior: "smooth" });
  }

  return (
    <>
      <Meta title="Home" path="/" />

      {/* Intro */}
      <section className="pt-16 pb-12">
        <Container>
          <div className="text-xs text-neutral-600 tracking-wide">
            WINE PROJECT
          </div>
          <h1 className="mt-3 font-serif text-5xl tracking-tighter2 leading-[1.05]">
            Impronta
          </h1>
          {home.isLoading ? (
            <Skeleton className="mt-4 h-5 w-2/3" />
          ) : home.data?.heroQuote ? (
            <p className="mt-4 text-lg text-neutral-700 leading-relaxed max-w-2xl">
              {home.data.heroQuote}
            </p>
          ) : null}
        </Container>
      </section>

      {/* Wine photo carousel */}
      <section className="pt-10 pb-16">
        <Container>
          <div className="flex items-center justify-between gap-6">
            <div>
              <div className="text-xs text-neutral-600 tracking-wide">VINI</div>
              <h2 className="mt-2 font-serif text-3xl tracking-tighter2">
                I vini
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollWines(-1)}
                className="focus-ring rounded-full w-9 h-9 flex items-center justify-center border border-black/10 bg-black/5 text-neutral-700 hover:bg-black/10"
                aria-label="Precedente"
              >
                ←
              </button>
              <button
                onClick={() => scrollWines(1)}
                className="focus-ring rounded-full w-9 h-9 flex items-center justify-center border border-black/10 bg-black/5 text-neutral-700 hover:bg-black/10"
                aria-label="Successivo"
              >
                →
              </button>
              <Link
                className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5 whitespace-nowrap"
                to="/vini"
              >
                Vedi tutti
              </Link>
            </div>
          </div>
        </Container>

        <div className="mx-auto w-full max-w-6xl overflow-visible">
          <div
            ref={wineScrollRef}
            className="mt-6 flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 px-5 sm:px-8"
            style={{ scrollbarWidth: "none" }}
          >
          {(wines.isLoading
            ? (Array.from({ length: 5 }) as unknown[])
            : featuredWines
          ).map((w, i) =>
            wines.isLoading ? (
              <div
                key={i}
                className="card-surface rounded-2xl overflow-hidden snap-start shrink-0 w-52"
              >
                <Skeleton className="h-52 w-full rounded-none" />
                <div className="p-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="mt-2 h-3 w-1/2" />
                </div>
              </div>
            ) : (
              <Link
                key={(w as Wine).id}
                to={`/vini/${(w as Wine).slug}`}
                className="focus-ring card-surface rounded-2xl overflow-hidden snap-start shrink-0 w-52 block hover:bg-black/[0.02]"
              >
                <div
                  className={`h-52 w-full ${(w as Wine).imageUrl ? "" : (wineTypeBg[(w as Wine).type] ?? "bg-neutral-100")} relative`}
                >
                  {(w as Wine).imageUrl ? (
                    <img
                      src={(w as Wine).imageUrl!}
                      alt={(w as Wine).name}
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="p-4">
                  <div className="font-serif text-lg tracking-tighter2 leading-tight">
                    {(w as Wine).name}
                    {(w as Wine).vintage ? (
                      <span className="ml-1 text-neutral-500 font-sans text-sm font-normal">
                        {(w as Wine).vintage}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    {wineTypeLabel[(w as Wine).type] ?? (w as Wine).type}
                  </div>
                </div>
              </Link>
            ),
          )}
          </div>
        </div>
      </section>

      {/* Zone */}
      <section className="pt-10 pb-16">
        <Container>
          <div className="flex items-center justify-between gap-6">
            <div>
              <div className="text-xs text-neutral-600 tracking-wide">ZONE</div>
              <h2 className="mt-2 font-serif text-3xl tracking-tighter2">
                Territori
              </h2>
            </div>
            <Link
              className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5"
              to="/zone"
            >
              Vedi tutte
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {(zones.isLoading
              ? (Array.from({ length: 3 }) as unknown[])
              : featuredZones
            ).map((z, i) =>
              zones.isLoading ? (
                <div key={i} className="card-surface rounded-2xl p-6">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="mt-4 h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-[85%]" />
                </div>
              ) : (
                <Link
                  key={(z as Zone).id}
                  to={`/zone/${(z as Zone).slug}`}
                  className="focus-ring card-surface rounded-2xl p-6 block hover:bg-black/[0.02]"
                >
                  <div className="font-serif text-2xl tracking-tighter2">
                    {(z as Zone).name}
                  </div>
                  <div className="mt-1 text-xs text-neutral-600">
                    {(z as Zone).country} · {(z as Zone).region}
                  </div>
                  <div className="mt-3 text-sm text-neutral-800 leading-relaxed">
                    {(z as Zone).descriptionShort}
                  </div>
                </Link>
              ),
            )}
          </div>
        </Container>
      </section>

      {/* Producers */}
      <section className="pt-10 pb-20">
        <Container>
          <div className="flex items-center justify-between gap-6">
            <div>
              <div className="text-xs text-neutral-600 tracking-wide">
                AZIENDE
              </div>
              <h2 className="mt-2 font-serif text-3xl tracking-tighter2">
                Aziende agricole
              </h2>
            </div>
            <Link
              className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5 whitespace-nowrap"
              to="/aziende"
            >
              Vedi tutte
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {(producers.isLoading
              ? (Array.from({ length: 4 }) as unknown[])
              : featuredProducers
            ).map((p, i) =>
              producers.isLoading ? (
                <div key={i} className="card-surface rounded-2xl p-6">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="mt-4 h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-[80%]" />
                </div>
              ) : (
                <Link
                  key={(p as Producer).id}
                  to={`/aziende/${(p as Producer).slug}`}
                  className="focus-ring card-surface rounded-2xl p-6 block hover:bg-black/[0.02]"
                >
                  <div className="font-serif text-2xl tracking-tighter2">
                    {(p as Producer).name}
                  </div>
                  <div className="mt-3 text-sm text-neutral-800 leading-relaxed">
                    {(p as Producer).philosophyShort}
                  </div>
                </Link>
              ),
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
