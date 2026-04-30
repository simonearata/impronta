import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Container } from "../components/Container";
import { Meta } from "../components/Meta";
import { Skeleton } from "../components/Skeleton";
import { useHome, useProducers, useWines, useZones } from "../data";
import type { Zone, Producer, Wine } from "../shared/types";

const scrollBy = (ref: React.RefObject<HTMLDivElement | null>, dir: number) => {
  ref.current?.scrollBy({ left: dir * 220, behavior: "smooth" });
};

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
  const zoneScrollRef = useRef<HTMLDivElement>(null);
  const producerScrollRef = useRef<HTMLDivElement>(null);
  const winesSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const scrolling = { active: false };
    function onWheel(e: WheelEvent) {
      if (scrolling.active) return;
      if (e.deltaY > 0 && window.scrollY < window.innerHeight * 0.5) {
        e.preventDefault();
        scrolling.active = true;
        const top = (winesSectionRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 64;
        window.scrollTo({ top, behavior: "smooth" });
        setTimeout(() => { scrolling.active = false; }, 900);
      }
    }
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

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


  return (
    <>
      <Meta title="Home" path="/" />

      {/* Intro */}
      <section className="h-screen flex items-center justify-center">
        <h1>
          <img
            src="/logo.png"
            alt="Impronta Wine Dealer"
            className="w-[600px] max-w-[90vw] h-auto"
          />
        </h1>
      </section>

      {/* Wine photo carousel */}
      <section ref={winesSectionRef} className="pt-10 pb-16">
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
                onClick={() => scrollBy(wineScrollRef, -1)}
                className="focus-ring rounded-full w-9 h-9 flex items-center justify-center border border-black/10 bg-black/5 text-neutral-700 hover:bg-black/10"
                aria-label="Precedente"
              >
                ←
              </button>
              <button
                onClick={() => scrollBy(wineScrollRef, 1)}
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollBy(zoneScrollRef, -1)}
                className="focus-ring rounded-full w-9 h-9 flex items-center justify-center border border-black/10 bg-black/5 text-neutral-700 hover:bg-black/10"
                aria-label="Precedente"
              >
                ←
              </button>
              <button
                onClick={() => scrollBy(zoneScrollRef, 1)}
                className="focus-ring rounded-full w-9 h-9 flex items-center justify-center border border-black/10 bg-black/5 text-neutral-700 hover:bg-black/10"
                aria-label="Successivo"
              >
                →
              </button>
              <Link
                className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5 whitespace-nowrap"
                to="/zone"
              >
                Vedi tutte
              </Link>
            </div>
          </div>
        </Container>

        <div className="mx-auto w-full max-w-6xl overflow-visible">
          <div
            ref={zoneScrollRef}
            className="mt-6 flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 px-5 sm:px-8"
            style={{ scrollbarWidth: "none" }}
          >
            {(zones.isLoading
              ? (Array.from({ length: 4 }) as unknown[])
              : featuredZones
            ).map((z, i) =>
              zones.isLoading ? (
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
                  key={(z as Zone).id}
                  to={`/zone/${(z as Zone).slug}`}
                  className="focus-ring card-surface rounded-2xl overflow-hidden snap-start shrink-0 w-52 block hover:bg-black/[0.02]"
                >
                  <div
                    className={`h-52 w-full ${(z as Zone).coverImageUrl ? "" : "bg-emerald-50"} relative`}
                  >
                    {(z as Zone).coverImageUrl ? (
                      <img
                        src={(z as Zone).coverImageUrl!}
                        alt={(z as Zone).name}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="p-4">
                    <div className="font-serif text-lg tracking-tighter2 leading-tight">
                      {(z as Zone).name}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {(z as Zone).country} · {(z as Zone).region}
                    </div>
                  </div>
                </Link>
              ),
            )}
          </div>
        </div>
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollBy(producerScrollRef, -1)}
                className="focus-ring rounded-full w-9 h-9 flex items-center justify-center border border-black/10 bg-black/5 text-neutral-700 hover:bg-black/10"
                aria-label="Precedente"
              >
                ←
              </button>
              <button
                onClick={() => scrollBy(producerScrollRef, 1)}
                className="focus-ring rounded-full w-9 h-9 flex items-center justify-center border border-black/10 bg-black/5 text-neutral-700 hover:bg-black/10"
                aria-label="Successivo"
              >
                →
              </button>
              <Link
                className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5 whitespace-nowrap"
                to="/aziende"
              >
                Vedi tutte
              </Link>
            </div>
          </div>
        </Container>

        <div className="mx-auto w-full max-w-6xl overflow-visible">
          <div
            ref={producerScrollRef}
            className="mt-6 flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 px-5 sm:px-8"
            style={{ scrollbarWidth: "none" }}
          >
            {(producers.isLoading
              ? (Array.from({ length: 4 }) as unknown[])
              : featuredProducers
            ).map((p, i) =>
              producers.isLoading ? (
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
                  key={(p as Producer).id}
                  to={`/aziende/${(p as Producer).slug}`}
                  className="focus-ring card-surface rounded-2xl overflow-hidden snap-start shrink-0 w-52 block hover:bg-black/[0.02]"
                >
                  <div
                    className={`h-52 w-full ${(p as Producer).coverImageUrl ? "" : "bg-stone-100"} relative`}
                  >
                    {(p as Producer).coverImageUrl ? (
                      <img
                        src={(p as Producer).coverImageUrl!}
                        alt={(p as Producer).name}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="p-4">
                    <div className="font-serif text-lg tracking-tighter2 leading-tight">
                      {(p as Producer).name}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500 line-clamp-2">
                      {(p as Producer).philosophyShort}
                    </div>
                  </div>
                </Link>
              ),
            )}
          </div>
        </div>
      </section>
    </>
  );
}
