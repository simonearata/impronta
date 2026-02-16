import { Link, useParams } from "react-router-dom";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Container } from "../components/Container";
import { EmptyState } from "../components/EmptyState";
import { Meta } from "../components/Meta";
import { Skeleton } from "../components/Skeleton";
import { useWineDetail } from "../data";
import { formatPriceEUR, wineTypeLabel } from "../shared/utils";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-black/10 py-3">
      <div className="text-xs text-neutral-600 tracking-wide">{label}</div>
      <div className="text-sm text-neutral-900 text-right">{value}</div>
    </div>
  );
}

export function WineDetailPage() {
  const { slug } = useParams();
  const data = useWineDetail(slug);

  const wine = data.data?.wine;
  const producer = data.data?.producer;
  const zone = data.data?.zone;

  const metaTitle = wine ? wine.name : "Vino";
  const metaPath = slug ? `/vini/${slug}` : "/vini";

  const isReady =
    !data.isLoading && !data.error && !!wine && !!producer && !!zone;

  const subject = isReady
    ? `Richiesta vino: ${producer.name} — ${wine.name}${
        wine.vintage ? ` (${wine.vintage})` : ""
      }`
    : "Richiesta vino";

  const message = isReady
    ? `Ciao, vorrei informazioni su "${wine.name}"${
        wine.vintage ? ` (${wine.vintage})` : ""
      } di ${producer.name} (zona: ${zone.name}). Grazie.`
    : "Ciao, vorrei informazioni su un vino. Grazie.";

  const contactHref = `/contatti?subject=${encodeURIComponent(
    subject,
  )}&message=${encodeURIComponent(message)}`;

  return (
    <>
      <Meta title={metaTitle} path={metaPath} />
      <section className="py-10">
        <Container>
          <Breadcrumbs
            items={[
              { label: "Home", to: "/" },
              { label: "Vini", to: "/vini" },
              ...(zone ? [{ label: zone.name, to: `/zone/${zone.slug}` }] : []),
              ...(producer
                ? [{ label: producer.name, to: `/aziende/${producer.slug}` }]
                : []),
              { label: wine?.name || "…" },
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
            </div>
          ) : !wine || !producer || !zone ? (
            <div className="mt-8">
              <EmptyState title="Vino non trovato" />
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <div className="card-surface rounded-2xl overflow-hidden">
                  <div className="h-44 sm:h-56 w-full bg-gradient-to-b from-black/10 to-black/0" />
                  <div className="p-8 sm:p-10">
                    <div className="text-xs text-neutral-600 tracking-wide">
                      <Link
                        className="focus-ring rounded hover:text-neutral-900"
                        to={`/aziende/${producer.slug}`}
                      >
                        {producer.name}
                      </Link>
                      {" · "}
                      <Link
                        className="focus-ring rounded hover:text-neutral-900"
                        to={`/zone/${zone.slug}`}
                      >
                        {zone.name}
                      </Link>
                    </div>

                    <h1 className="mt-2 font-serif text-4xl tracking-tighter2">
                      {wine.name}
                    </h1>

                    <div className="mt-4 text-sm text-neutral-800 leading-relaxed max-w-2xl">
                      {wine.tastingNotes || "Note in aggiornamento."}
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                      <Link
                        className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5"
                        to={contactHref}
                        aria-label="Contattaci per questo vino"
                      >
                        Contattaci per questo vino
                      </Link>

                      <Link
                        className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5"
                        to="/vini"
                        aria-label="Torna ai vini"
                      >
                        Torna ai vini
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="mt-6 card-surface rounded-2xl p-8 sm:p-10">
                  <div className="text-xs text-neutral-600 tracking-wide">
                    DETTAGLI
                  </div>
                  <div className="mt-4">
                    <Row label="Tipologia" value={wineTypeLabel(wine.type)} />
                    <Row label="Annata" value={wine.vintage ?? "—"} />
                    <Row label="Varietà" value={wine.grapes ?? "—"} />
                    <Row label="Alcol" value={wine.alcohol ?? "—"} />
                    <Row
                      label="Formato"
                      value={
                        wine.bottleSizeMl ? `${wine.bottleSizeMl} ml` : "—"
                      }
                    />
                    <Row
                      label="Disponibilità"
                      value={
                        wine.isAvailable ? "Disponibile" : "Non disponibile"
                      }
                    />
                    <Row
                      label="Prezzo"
                      value={formatPriceEUR(wine.priceCents) ?? "—"}
                    />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="card-surface rounded-2xl p-8 sm:p-10">
                  <div className="text-xs text-neutral-600 tracking-wide">
                    VINIFICAZIONE
                  </div>
                  <div className="mt-3 text-sm text-neutral-800 leading-relaxed">
                    {wine.vinification ?? "—"}
                  </div>

                  <div className="mt-8 text-xs text-neutral-600 tracking-wide">
                    ABBINAMENTI
                  </div>
                  <div className="mt-3 text-sm text-neutral-800 leading-relaxed">
                    {wine.pairing ?? "—"}
                  </div>
                </div>

                <div className="mt-6 card-surface rounded-2xl p-8 sm:p-10">
                  <div className="text-xs text-neutral-600 tracking-wide">
                    AZIENDA
                  </div>
                  <div className="mt-2 font-serif text-2xl tracking-tighter2">
                    {producer.name}
                  </div>
                  <div className="mt-3 text-sm text-neutral-800 leading-relaxed">
                    {producer.philosophyShort}
                  </div>
                  <div className="mt-6">
                    <Link
                      className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5 inline-flex"
                      to={`/aziende/${producer.slug}`}
                      aria-label="Vai all’azienda"
                    >
                      Vai all’azienda
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
