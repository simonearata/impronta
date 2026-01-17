import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Container } from "../components/Container";
import { EmptyState } from "../components/EmptyState";
import { Input } from "../components/Input";
import { Meta } from "../components/Meta";
import { Select } from "../components/Select";
import { Skeleton } from "../components/Skeleton";
import { useProducers, useZones } from "../data";
import { cn } from "../shared/utils";
import { useDebouncedValue } from "../shared/useDebouncedValue";

export function ProducersPage() {
  const [sp, setSp] = useSearchParams();

  const zoneRaw = sp.get("zone") || "";
  const qRaw = sp.get("q") || "";

  const zones = useZones({});

  const zoneIsValid = (zones.data || []).some((z) => z.slug === zoneRaw);
  const zone = zoneIsValid ? zoneRaw : "";

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

  const list = useProducers({
    zone: zone || undefined,
    q: qRaw || undefined,
  });

  const zoneOptions = useMemo(() => {
    return (zones.data || [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [zones.data]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(sp);
    const v = value.trim();
    if (v) next.set(key, v);
    else next.delete(key);
    setSp(next, { replace: true });
  }

  return (
    <>
      <Meta title="Aziende" path="/aziende" />
      <section className="py-12">
        <Container>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs text-neutral-600 tracking-wide">
                AZIENDE
              </div>
              <h1 className="mt-2 font-serif text-4xl tracking-tighter2">
                Aziende agricole
              </h1>
              <div className="mt-3 text-sm text-neutral-700 max-w-2xl leading-relaxed">
                Filtra per zona oppure cerca per nome e filosofia.
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 w-full md:max-w-xl">
              <div>
                <label className="sr-only" htmlFor="prod-zone">
                  Zona
                </label>
                <Select
                  id="prod-zone"
                  value={zone}
                  onChange={(e) => updateParam("zone", e.target.value)}
                  aria-label="Filtro zona"
                  disabled={zones.isLoading}
                >
                  <option value="">Tutte le zone</option>
                  {zoneOptions.map((z) => (
                    <option key={z.id} value={z.slug}>
                      {z.name} ({z.country})
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="sr-only" htmlFor="prod-q">
                  Cerca
                </label>
                <Input
                  id="prod-q"
                  value={qDraft}
                  placeholder="Cerca…"
                  onChange={(e) => setQDraft(e.target.value)}
                  aria-label="Cerca aziende"
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
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="card-surface rounded-2xl p-6">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="mt-4 h-4 w-full" />
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
                {(list.data || []).map((p) => (
                  <Link
                    key={p.id}
                    to={`/aziende/${p.slug}`}
                    className={cn(
                      "focus-ring card-surface rounded-2xl p-6 block hover:bg-black/[0.02] transition"
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
        </Container>
      </section>
    </>
  );
}
