import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { Container } from "./Container";
import { cn } from "../shared/utils";

const linkBase = "focus-ring rounded-xl px-3 py-2 text-sm transition block";
const linkInactive = "text-neutral-800 hover:bg-black/5";
const linkActive = "bg-[#0000000a] text-[rgb(var(--bg))]";

export function AdminShell() {
  const auth = useAuth();

  const items = [
    { to: "/admin", label: "Dashboard", end: true },
    { to: "/admin/zone", label: "Zone" },
    { to: "/admin/aziende", label: "Aziende" },
    { to: "/admin/vini", label: "Vini" },
    { to: "/admin/magazzino", label: "Magazzino" },
    { to: "/admin/home", label: "Home" },
    { to: "/admin/contatti", label: "Contatti" },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 backdrop-blur bg-[rgb(var(--bg))]/80 border-b border-black/10">
        <Container className="h-16 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-xl tracking-tight">Impronta</span>
            <span className="text-xs text-neutral-600">admin</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-xs text-neutral-600">
              {auth.session?.user.email}
            </div>
            <button
              className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5"
              onClick={() => auth.logout()}
              aria-label="Logout"
            >
              Logout
            </button>
          </div>
        </Container>
      </header>

      <Container className="py-10 grid gap-8 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <nav aria-label="Admin" className="card-surface rounded-2xl p-3">
            <div className="px-3 py-2 text-xs text-neutral-600 tracking-wide">
              SEZIONI
            </div>
            <div className="mt-1 flex flex-col gap-1">
              {items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  className={({ isActive }) =>
                    cn(linkBase, isActive ? linkActive : linkInactive)
                  }
                >
                  {it.label}
                </NavLink>
              ))}
            </div>
          </nav>
        </aside>

        <main className="lg:col-span-9">
          <Outlet />
        </main>
      </Container>
    </div>
  );
}
