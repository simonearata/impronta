import { Link } from "react-router-dom";
import { Container } from "../components/Container";
import { Meta } from "../components/Meta";
import { Skeleton } from "../components/Skeleton";
import { useHome, useProducers, useZones } from "../data";
import type { Zone, Producer } from "../shared/types";

function pickByIds<T extends { id: string }>(items: T[], ids: string[]) {
  const map = new Map(items.map((x) => [x.id, x] as const));
  return ids.map((id) => map.get(id)).filter(Boolean) as T[];
}

export function HomePage() {
  const home = useHome();
  const zones = useZones({});
  const producers = useProducers({});

  const allZones = zones.data || [];
  const allProducers = producers.data || [];

  const featuredZoneIds = home.data?.featuredZoneIds || [];
  const featuredProducerIds = home.data?.featuredProducerIds || [];

  const pickedZones = featuredZoneIds.length
    ? pickByIds(allZones, featuredZoneIds)
    : [];

  const pickedProducers = featuredProducerIds.length
    ? pickByIds(allProducers, featuredProducerIds)
    : [];

  const featuredZones = pickedZones.length ? pickedZones : allZones.slice(0, 3);
  const featuredProducers = pickedProducers.length
    ? pickedProducers
    : allProducers.slice(0, 4);

  return (
    <>
      <Meta title="Home" path="/" />
      <section className="relative">
        <div className="h-[72vh] min-h-[520px] w-full bg-gradient-to-b from-black/10 to-black/0 overflow-hidden">
          {home.data?.heroImageUrl ? (
            <img
              src={home.data.heroImageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : null}
        </div>
        <div className="absolute inset-0">
          <Container className="h-full flex items-end pb-10">
            <div className="max-w-2xl">
              <div className="text-xs text-neutral-600 tracking-wide">
                WINE PROJECT
              </div>
              <h1 className="mt-3 font-serif text-5xl tracking-tighter2 leading-[1.05]">
                Impronta
              </h1>
              <div className="mt-4 text-lg text-neutral-800 leading-relaxed">
                {home.isLoading ? (
                  <Skeleton className="h-6 w-[90%]" />
                ) : (
                  home.data?.heroQuote
                )}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  className="focus-ring rounded-full px-4 py-2 text-sm bg-black/5 border border-black/10"
                  to="/zone"
                >
                  Esplora le zone
                </Link>
                <Link
                  className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5"
                  to="/contatti"
                >
                  Contattaci
                </Link>
              </div>
            </div>
          </Container>
        </div>
      </section>

      <section className="py-16">
        <Container className="grid gap-10 md:grid-cols-3">
          <div className="md:col-span-1">
            <div className="text-xs text-neutral-600 tracking-wide">
              MANIFESTO
            </div>
            <h2 className="mt-3 font-serif text-3xl tracking-tighter2 leading-tight">
              Un ritmo calmo, informazioni chiare.
            </h2>
          </div>

          <div className="md:col-span-2 grid gap-8">
            <div className="card-surface rounded-2xl p-8">
              <div className="text-xs text-neutral-600 tracking-wide">
                STORY
              </div>
              <div className="mt-3 text-sm text-neutral-800 leading-relaxed">
                {home.isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  home.data?.story
                )}
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="card-surface rounded-2xl p-8">
                <div className="text-xs text-neutral-600 tracking-wide">
                  VISION
                </div>
                <div className="mt-3 text-sm text-neutral-800 leading-relaxed">
                  {home.isLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : (
                    home.data?.vision
                  )}
                </div>
              </div>
              <div className="card-surface rounded-2xl p-8">
                <div className="text-xs text-neutral-600 tracking-wide">
                  MISSION
                </div>
                <div className="mt-3 text-sm text-neutral-800 leading-relaxed">
                  {home.isLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : (
                    home.data?.mission
                  )}
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="pb-16">
        <Container>
          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="text-xs text-neutral-600 tracking-wide">ZONE</div>
              <h3 className="mt-2 font-serif text-3xl tracking-tighter2">
                Territori
              </h3>
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

      <section className="pb-20">
        <Container>
          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="text-xs text-neutral-600 tracking-wide">
                AZIENDE
              </div>
              <h3 className="mt-2 font-serif text-3xl tracking-tighter2">
                Aziende agricole
              </h3>
            </div>
            <Link
              className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5"
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
