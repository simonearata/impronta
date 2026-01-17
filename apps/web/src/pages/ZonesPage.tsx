import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Container } from "../components/Container";
import { EmptyState } from "../components/EmptyState";
import { Input } from "../components/Input";
import { Meta } from "../components/Meta";
import { Select } from "../components/Select";
import { Skeleton } from "../components/Skeleton";
import { useZones } from "../data";
import { cn } from "../shared/utils";
import { useDebouncedValue } from "../shared/useDebouncedValue";

function uniqSorted(items: string[]) {
  return Array.from(new Set(items)).sort((a, b) => a.localeCompare(b));
}

export function ZonesPage() {
  const [sp, setSp] = useSearchParams();

  const country = sp.get("country") || "";
  const region = sp.get("region") || "";
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

  const all = useZones({});
  const list = useZones({
    country: country || undefined,
    region: region || undefined,
    q: qRaw || undefined,
  });

  const countries = useMemo(
    () => uniqSorted((all.data || []).map((z) => z.country)),
    [all.data]
  );

  const regions = useMemo(
    () =>
      uniqSorted(
        (all.data || [])
          .filter((z) => (country ? z.country === country : true))
          .map((z) => z.region)
      ),
    [all.data, country]
  );

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(sp);
    if (value) next.set(key, value);
    else next.delete(key);

    if (key === "country") {
      next.delete("region");
    }

    setSp(next, { replace: true });
  }

  return (
    <>
      <Meta title="Zone" path="/zone" />
      <section className="py-12">
        <Container>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs text-neutral-600 tracking-wide">ZONE</div>
              <h1 className="mt-2 font-serif text-4xl tracking-tighter2">
                Territori
              </h1>
              <div className="mt-3 text-sm text-neutral-700 max-w-2xl leading-relaxed">
                Filtra per paese e regione, oppure cerca per nome e descrizione.
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 w-full md:max-w-2xl">
              <div>
                <label className="sr-only" htmlFor="zone-country">
                  Paese
                </label>
                <Select
                  id="zone-country"
                  value={country}
                  onChange={(e) => updateParam("country", e.target.value)}
                  aria-label="Filtro paese"
                >
                  <option value="">Tutti i paesi</option>
                  {countries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="sr-only" htmlFor="zone-region">
                  Regione
                </label>
                <Select
                  id="zone-region"
                  value={region}
                  onChange={(e) => updateParam("region", e.target.value)}
                  aria-label="Filtro regione"
                  disabled={!regions.length}
                >
                  <option value="">Tutte le regioni</option>
                  {regions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="sr-only" htmlFor="zone-q">
                  Cerca
                </label>
                <Input
                  id="zone-q"
                  value={qDraft}
                  placeholder="Cerca…"
                  onChange={(e) => setQDraft(e.target.value)}
                  aria-label="Cerca zone"
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
              <div className="grid gap-4 md:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="card-surface rounded-2xl p-6">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="mt-3 h-4 w-1/2" />
                    <Skeleton className="mt-5 h-4 w-full" />
                    <Skeleton className="mt-2 h-4 w-[85%]" />
                  </div>
                ))}
              </div>
            ) : (list.data || []).length === 0 ? (
              <EmptyState
                title="Nessun risultato"
                description="Prova a cambiare filtri o ricerca."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {(list.data || []).map((z) => (
                  <Link
                    key={z.id}
                    to={`/zone/${z.slug}`}
                    className={cn(
                      "focus-ring card-surface rounded-2xl p-6 block hover:bg-black/[0.02] transition"
                    )}
                  >
                    <div className="font-serif text-2xl tracking-tighter2">
                      {z.name}
                    </div>
                    <div className="mt-1 text-xs text-neutral-600">
                      {z.country} · {z.region}
                    </div>
                    <div className="mt-3 text-sm text-neutral-800 leading-relaxed">
                      {z.descriptionShort}
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
