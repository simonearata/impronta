import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Container } from "../components/Container";
import { EmptyState } from "../components/EmptyState";
import { Input } from "../components/Input";
import { Meta } from "../components/Meta";
import { Select } from "../components/Select";
import { Skeleton } from "../components/Skeleton";
import { useProducers, useWines, useZones } from "../data";
import type { WineType } from "../shared/types";
import { cn, formatPriceEUR, wineTypeLabel } from "../shared/utils";
import { useDebouncedValue } from "../shared/useDebouncedValue";

const wineTypes: Array<{ value: WineType; label: string }> = [
  { value: "white", label: "Bianco" },
  { value: "red", label: "Rosso" },
  { value: "rose", label: "Rosé" },
  { value: "orange", label: "Orange" },
  { value: "sparkling", label: "Spumante" },
  { value: "other", label: "Altro" },
];

export function WinesPage() {
  const [sp, setSp] = useSearchParams();

  const zone = sp.get("zone") || "";
  const producer = sp.get("producer") || "";

  const typeRaw = sp.get("type") || "";
  const type = wineTypes.some((t) => t.value === typeRaw)
    ? (typeRaw as WineType)
    : "";

  const vintage = sp.get("vintage") || "";
  const qRaw = sp.get("q") || "";

  const [qDraft, setQDraft] = useState(qRaw);
  useEffect(() => setQDraft(qRaw), [qRaw]);

  const qDebounced = useDebouncedValue(qDraft, 200);

  useEffect(() => {
    const next = new URLSearchParams(sp);
    const v = qDebounced.trim();

    if (v) next.set("q", v);
    else next.delete("q");

    if (next.toString() !== sp.toString()) {
      setSp(next, { replace: true });
    }
  }, [qDebounced, sp, setSp]);

  const zones = useZones({});
  const producers = useProducers({ zone: zone || undefined });
  const list = useWines({
    zone: zone || undefined,
    producer: producer || undefined,
    type: type || undefined,
    vintage: vintage || undefined,
    q: qRaw || undefined,
  });

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(sp);
    if (value) next.set(key, value);
    else next.delete(key);

    if (key === "zone") {
      next.delete("producer");
    }

    setSp(next, { replace: true });
  }

  return (
    <>
      <Meta title="Vini" path="/vini" />
      <section className="py-12">
        <Container>
          <div className="flex flex-col gap-6">
            <div>
              <div className="text-xs text-neutral-600 tracking-wide">VINI</div>
              <h1 className="mt-2 font-serif text-4xl tracking-tighter2">
                Referenze
              </h1>
              <div className="mt-3 text-sm text-neutral-700 max-w-2xl leading-relaxed">
                Filtra per zona, azienda e tipologia. Cerca per nome e note.
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="sr-only" htmlFor="wine-zone">
                  Zona
                </label>
                <Select
                  id="wine-zone"
                  value={zone}
                  onChange={(e) => updateParam("zone", e.target.value)}
                  aria-label="Filtro zona"
                >
                  <option value="">Tutte le zone</option>
                  {(zones.data || []).map((z) => (
                    <option key={z.id} value={z.slug}>
                      {z.name} ({z.country})
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="sr-only" htmlFor="wine-producer">
                  Azienda
                </label>
                <Select
                  id="wine-producer"
                  value={producer}
                  onChange={(e) => updateParam("producer", e.target.value)}
                  aria-label="Filtro azienda"
                  disabled={!producers.data?.length}
                >
                  <option value="">Tutte le aziende</option>
                  {(producers.data || []).map((p) => (
                    <option key={p.id} value={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="sr-only" htmlFor="wine-type">
                  Tipologia
                </label>
                <Select
                  id="wine-type"
                  value={type}
                  onChange={(e) => updateParam("type", e.target.value)}
                  aria-label="Filtro tipologia"
                >
                  <option value="">Tutte le tipologie</option>
                  {wineTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="sr-only" htmlFor="wine-vintage">
                  Annata
                </label>
                <Input
                  id="wine-vintage"
                  value={vintage}
                  placeholder="Annata (es. 2024)"
                  onChange={(e) => updateParam("vintage", e.target.value)}
                  aria-label="Filtro annata"
                />
              </div>

              <div>
                <label className="sr-only" htmlFor="wine-q">
                  Cerca
                </label>
                <Input
                  id="wine-q"
                  value={qDraft}
                  placeholder="Cerca…"
                  onChange={(e) => setQDraft(e.target.value)}
                  aria-label="Cerca vini"
                />
              </div>
            </div>
          </div>

          <div className="mt-8">
            {list.error ? (
              <EmptyState
                title="Errore"
                description={String(list.error.message || list.error)}
              />
            ) : list.isLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="card-surface rounded-2xl p-6">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="mt-3 h-4 w-1/3" />
                    <Skeleton className="mt-5 h-4 w-full" />
                    <Skeleton className="mt-2 h-4 w-[80%]" />
                  </div>
                ))}
              </div>
            ) : (list.data || []).length === 0 ? (
              <EmptyState
                title="Nessun risultato"
                description="Prova a cambiare filtri o ricerca."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {(list.data || []).map((w) => (
                  <Link
                    key={w.id}
                    to={`/vini/${w.slug}`}
                    className={cn(
                      "focus-ring card-surface rounded-2xl p-6 block hover:bg-black/[0.02] transition"
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
                        {w.isAvailable ? "Disponibile" : "Non disponibile"}
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
        </Container>
      </section>
    </>
  );
}
