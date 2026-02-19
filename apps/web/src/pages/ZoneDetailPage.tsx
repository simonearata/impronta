import { Link, useParams } from "react-router-dom";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Container } from "../components/Container";
import { EmptyState } from "../components/EmptyState";
import { Meta } from "../components/Meta";
import { Skeleton } from "../components/Skeleton";
import { useZoneDetail } from "../data";
import { cn } from "../shared/utils";

export function ZoneDetailPage() {
  const { slug } = useParams();
  const data = useZoneDetail(slug);

  const zone = data.data?.zone;
  const producers = data.data?.producers || [];

  return (
    <>
      <Meta
        title={zone ? zone.name : "Zona"}
        path={slug ? `/zone/${slug}` : "/zone"}
      />
      <section className="py-10">
        <Container>
          <Breadcrumbs
            items={[
              { label: "Home", to: "/" },
              { label: "Zone", to: "/zone" },
              { label: zone?.name || "…" },
            ]}
          />

          {data.error ? (
            <div className="mt-8">
              <EmptyState
                title="Errore"
                description={String(data.error.message || data.error)}
              />
            </div>
          ) : data.isLoading ? (
            <div className="mt-8">
              <div className="card-surface rounded-2xl p-8">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="mt-3 h-4 w-1/3" />
                <Skeleton className="mt-6 h-24 w-full" />
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="card-surface rounded-2xl p-6">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="mt-4 h-4 w-full" />
                    <Skeleton className="mt-2 h-4 w-[80%]" />
                  </div>
                ))}
              </div>
            </div>
          ) : !zone ? (
            <div className="mt-8">
              <EmptyState title="Zona non trovata" />
            </div>
          ) : (
            <div className="mt-8">
              <div className="relative overflow-hidden rounded-2xl card-surface">
                <div className="h-44 sm:h-56 w-full bg-gradient-to-b from-black/10 to-black/0 overflow-hidden">
                  {zone.coverImageUrl ? (
                    <img
                      src={zone.coverImageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="p-8 sm:p-10">
                  <div className="text-xs text-neutral-600 tracking-wide">
                    {zone.country} · {zone.region}
                  </div>
                  <h1 className="mt-2 font-serif text-4xl tracking-tighter2">
                    {zone.name}
                  </h1>
                  <div className="mt-5 text-sm text-neutral-800 leading-relaxed max-w-3xl">
                    {zone.descriptionLong}
                  </div>
                </div>
              </div>

              <div className="mt-10 flex items-end justify-between gap-6">
                <div>
                  <div className="text-xs text-neutral-600 tracking-wide">
                    AZIENDE
                  </div>
                  <h2 className="mt-2 font-serif text-3xl tracking-tighter2">
                    Aziende agricole
                  </h2>
                </div>
                <Link
                  className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5"
                  to="/aziende"
                >
                  Tutte le aziende
                </Link>
              </div>

              <div className="mt-6">
                {producers.length === 0 ? (
                  <EmptyState
                    title="Nessuna azienda"
                    description="Non ci sono aziende associate a questa zona."
                  />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {producers.map((p) => (
                      <Link
                        key={p.id}
                        to={`/aziende/${p.slug}`}
                        className={cn(
                          "focus-ring card-surface rounded-2xl p-6 block hover:bg-black/[0.02] transition",
                        )}
                      >
                        <div className="font-serif text-2xl tracking-tighter2">
                          {p.name}
                        </div>
                        <div className="mt-3 text-sm text-neutral-800 leading-relaxed">
                          {p.philosophyShort}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
