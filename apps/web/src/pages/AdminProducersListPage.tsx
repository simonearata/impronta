import { Link } from "react-router-dom";
import { Meta } from "../components/Meta";
import { EmptyState } from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";
import { useAdminProducers, useAdminZones } from "../data/admin";

export function AdminProducersListPage() {
  const producers = useAdminProducers();
  const zones = useAdminZones();

  const zoneName = (zoneId: string) =>
    zones.data?.find((z) => z.id === zoneId)?.name || "—";

  return (
    <>
      <Meta title="Admin Aziende" path="/admin/aziende" />
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="text-xs text-neutral-600 tracking-wide">AZIENDE</div>
          <h1 className="mt-2 font-serif text-4xl tracking-tighter2">
            Aziende
          </h1>
        </div>
        <Link
          className="focus-ring rounded-full px-4 py-2 text-sm bg-black/5 text-[rgb(var(--bg))]"
          to="/admin/aziende/new"
        >
          Nuova azienda
        </Link>
      </div>

      <div className="mt-8">
        {producers.error ? (
          <EmptyState
            title="Errore"
            description={String(producers.error.message || producers.error)}
          />
        ) : producers.isLoading ? (
          <div className="grid gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card-surface rounded-2xl p-6">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="mt-3 h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : (producers.data || []).length === 0 ? (
          <EmptyState title="Nessuna azienda" />
        ) : (
          <div className="grid gap-3">
            {(producers.data || []).map((p) => (
              <div
                key={p.id}
                className="card-surface rounded-2xl p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-serif text-2xl tracking-tighter2">
                    {p.name}
                  </div>
                  <div className="mt-1 text-xs text-neutral-600">
                    {zoneName(p.zoneId)} ·{" "}
                    <span className="font-mono">{p.slug}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5"
                    to={`/aziende/${p.slug}`}
                  >
                    Apri public
                  </Link>
                  <Link
                    className="focus-ring rounded-full px-4 py-2 text-sm bg-black/5 text-[rgb(var(--bg))]"
                    to={`/admin/aziende/${p.id}`}
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
