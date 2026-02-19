import { Link, useParams } from "react-router-dom";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Container } from "../components/Container";
import { EmptyState } from "../components/EmptyState";
import { Meta } from "../components/Meta";
import { Skeleton } from "../components/Skeleton";
import { useProducerDetail } from "../data";
import { cn, formatPriceEUR, wineTypeLabel } from "../shared/utils";

export function ProducerDetailPage() {
  const { slug } = useParams();
  const data = useProducerDetail(slug);

  const producer = data.data?.producer;
  const zone = data.data?.zone;
  const wines = data.data?.wines || [];

  return (
    <>
      <Meta
        title={producer ? producer.name : "Azienda"}
        path={slug ? `/aziende/${slug}` : "/aziende"}
      />
      <section className="py-10">
        <Container>
          <Breadcrumbs
            items={[
              { label: "Home", to: "/" },
              { label: "Aziende", to: "/aziende" },
              ...(zone ? [{ label: zone.name, to: `/zone/${zone.slug}` }] : []),
              { label: producer?.name || "…" },
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
                <Skeleton className="mt-6 h-28 w-full" />
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
          ) : !producer || !zone ? (
            <div className="mt-8">
              <EmptyState title="Azienda non trovata" />
            </div>
          ) : (
            <div className="mt-8">
              <div className="relative overflow-hidden rounded-2xl card-surface">
                <div className="h-44 sm:h-56 w-full bg-gradient-to-b from-black/10 to-black/0 overflow-hidden">
                  {producer.coverImageUrl ? (
                    <img
                      src={producer.coverImageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="p-8 sm:p-10">
                  <div className="text-xs text-neutral-600 tracking-wide">
                    {zone.name} · {zone.country}
                    {producer.location ? ` · ${producer.location}` : ""}
                  </div>
                  <h1 className="mt-2 font-serif text-4xl tracking-tighter2">
                    {producer.name}
                  </h1>
                  <div className="mt-5 text-sm text-neutral-800 leading-relaxed max-w-3xl">
                    {producer.philosophyShort}
                  </div>

                  <div className="mt-8 grid gap-6 md:grid-cols-3">
                    <div className="card-surface rounded-2xl p-6 border border-black/10 bg-black/[0.02]">
                      <div className="text-xs text-neutral-600 tracking-wide">
                        ZONA
                      </div>
                      <Link
                        className="mt-2 inline-block focus-ring rounded hover:text-neutral-900"
                        to={`/zone/${zone.slug}`}
                      >
                        {zone.name}
                      </Link>
                    </div>
                    <div className="card-surface rounded-2xl p-6 border border-black/10 bg-black/[0.02]">
                      <div className="text-xs text-neutral-600 tracking-wide">
                        SITO
                      </div>
                      <div className="mt-2 text-sm text-neutral-800">
                        {producer.website ? producer.website : "—"}
                      </div>
                    </div>
                    <div className="card-surface rounded-2xl p-6 border border-black/10 bg-black/[0.02]">
                      <div className="text-xs text-neutral-600 tracking-wide">
                        INSTAGRAM
                      </div>
                      <div className="mt-2 text-sm text-neutral-800">
                        {producer.instagram ? producer.instagram : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-10">
                    <div className="text-xs text-neutral-600 tracking-wide">
                      STORIA
                    </div>
                    <div className="mt-3 prose prose-neutral max-w-none">
                      <p>{producer.storyLong}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <div className="text-xs text-neutral-600 tracking-wide">
                  VINI
                </div>
                <h2 className="mt-2 font-serif text-3xl tracking-tighter2">
                  Referenze
                </h2>

                <div className="mt-6">
                  {wines.length === 0 ? (
                    <EmptyState
                      title="Nessun vino"
                      description="Non ci sono vini associati a questa azienda."
                    />
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {wines.map((w) => (
                        <Link
                          key={w.id}
                          to={`/vini/${w.slug}`}
                          className={cn(
                            "focus-ring card-surface rounded-2xl p-6 block hover:bg-black/[0.02] transition",
                          )}
                        >
                          <div className="flex items-start justify-between gap-6">
                            <div>
                              <div className="font-serif text-2xl tracking-tighter2">
                                {w.name}
                              </div>
                              <div className="mt-1 text-xs text-neutral-600">
                                {wineTypeLabel(w.type)}
                                {w.vintage ? ` · ${w.vintage}` : ""}
                              </div>
                            </div>
                            <div className="text-xs text-neutral-700 text-right">
                              {w.isAvailable
                                ? "Disponibile"
                                : "Non disponibile"}
                              {w.priceCents != null ? (
                                <div className="mt-1">
                                  {formatPriceEUR(w.priceCents)}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          {w.tastingNotes ? (
                            <div className="mt-3 text-sm text-neutral-800 leading-relaxed">
                              {w.tastingNotes}
                            </div>
                          ) : null}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
