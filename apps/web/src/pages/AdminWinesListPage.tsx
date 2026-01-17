import { Link } from "react-router-dom";
import { Meta } from "../components/Meta";
import { EmptyState } from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";
import { wineTypeLabel } from "../shared/utils";
import { useAdminProducers, useAdminWines, useAdminZones } from "../data/admin";

export function AdminWinesListPage() {
  const wines = useAdminWines();
  const producers = useAdminProducers();
  const zones = useAdminZones();

  const producerName = (producerId: string) =>
    producers.data?.find((p) => p.id === producerId)?.name || "—";
  const zoneName = (producerId: string) => {
    const p = producers.data?.find((x) => x.id === producerId);
    if (!p) return "—";
    return zones.data?.find((z) => z.id === p.zoneId)?.name || "—";
  };

  return (
    <>
      <Meta title="Admin Vini" path="/admin/vini" />
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="text-xs text-neutral-600 tracking-wide">VINI</div>
          <h1 className="mt-2 font-serif text-4xl tracking-tighter2">Vini</h1>
        </div>
        <Link
          className="focus-ring rounded-full px-4 py-2 text-sm bg-black/5 text-[rgb(var(--bg))]"
          to="/admin/vini/new"
        >
          Nuovo vino
        </Link>
      </div>

      <div className="mt-8">
        {wines.error ? (
          <EmptyState
            title="Errore"
            description={String(wines.error.message || wines.error)}
          />
        ) : wines.isLoading ? (
          <div className="grid gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card-surface rounded-2xl p-6">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="mt-3 h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : (wines.data || []).length === 0 ? (
          <EmptyState title="Nessun vino" />
        ) : (
          <div className="grid gap-3">
            {(wines.data || []).map((w) => (
              <div
                key={w.id}
                className="card-surface rounded-2xl p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-serif text-2xl tracking-tighter2">
                    {w.name}
                  </div>
                  <div className="mt-1 text-xs text-neutral-600">
                    {producerName(w.producerId)} · {zoneName(w.producerId)} ·{" "}
                    {wineTypeLabel(w.type)}
                    {w.vintage ? ` · ${w.vintage}` : ""} ·{" "}
                    <span className="font-mono">{w.slug}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5"
                    to={`/vini/${w.slug}`}
                  >
                    Apri public
                  </Link>
                  <Link
                    className="focus-ring rounded-full px-4 py-2 text-sm bg-black/5 text-[rgb(var(--bg))]"
                    to={`/admin/vini/${w.id}`}
                  >
                    Modifica
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
