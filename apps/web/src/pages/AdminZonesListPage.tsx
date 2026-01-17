import { Link } from "react-router-dom";
import { Meta } from "../components/Meta";
import { EmptyState } from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";
import { useAdminZones } from "../data/admin";

export function AdminZonesListPage() {
  const zones = useAdminZones();

  return (
    <>
      <Meta title="Admin Zone" path="/admin/zone" />
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="text-xs text-neutral-600 tracking-wide">ZONE</div>
          <h1 className="mt-2 font-serif text-4xl tracking-tighter2">Zone</h1>
        </div>
        <Link
          className="focus-ring rounded-full px-4 py-2 text-sm bg-black/5 text-[rgb(var(--bg))]"
          to="/admin/zone/new"
        >
          Nuova zona
        </Link>
      </div>

      <div className="mt-8">
        {zones.error ? (
          <EmptyState
            title="Errore"
            description={String(zones.error.message || zones.error)}
          />
        ) : zones.isLoading ? (
          <div className="grid gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card-surface rounded-2xl p-6">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="mt-3 h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : (zones.data || []).length === 0 ? (
          <EmptyState title="Nessuna zona" />
        ) : (
          <div className="grid gap-3">
            {(zones.data || []).map((z) => (
              <div
                key={z.id}
                className="card-surface rounded-2xl p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-serif text-2xl tracking-tighter2">
                    {z.name}
                  </div>
                  <div className="mt-1 text-xs text-neutral-600">
                    {z.country} · {z.region} ·{" "}
                    <span className="font-mono">{z.slug}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5"
                    to={`/zone/${z.slug}`}
                  >
                    Apri public
                  </Link>
                  <Link
                    className="focus-ring rounded-full px-4 py-2 text-sm bg-black/5 text-[rgb(var(--bg))]"
                    to={`/admin/zone/${z.id}`}
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
