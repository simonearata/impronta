import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "../shared/utils";
import { Container } from "./Container";

const linkBase = "focus-ring rounded-full px-3 py-2 text-sm transition";
const linkInactive = "text-neutral-700 hover:bg-black/5 hover:text-neutral-900";
const linkActive = "bg-[#0000000a] text-[rgb(var(--bg))]";

export function NavBar() {
  const items = useMemo(
    () => [
      { to: "/", label: "Home" },
      { to: "/my-project", label: "My Project" },
      { to: "/zone", label: "Zone" },
      { to: "/aziende", label: "Aziende" },
      { to: "/vini", label: "Vini" },
      { to: "/contatti", label: "Contatti" },
    ],
    []
  );

  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-[rgb(var(--bg))]/80 border-b border-black/10">
      <Container className="h-16 flex items-center justify-between">
        <NavLink
          to="/"
          className="focus-ring rounded flex items-baseline gap-2"
          onClick={() => setOpen(false)}
        >
          <span className="font-serif text-xl tracking-tight">Impronta</span>
          <span className="text-xs text-neutral-600">wine project</span>
        </NavLink>

        <nav
          className="hidden md:flex items-center gap-1"
          aria-label="Principale"
        >
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                cn(linkBase, isActive ? linkActive : linkInactive)
              }
              end={it.to === "/"}
            >
              {it.label}
            </NavLink>
          ))}
        </nav>

        <button
          className="md:hidden focus-ring rounded-full px-3 py-2 text-sm border border-black/10 bg-black/5"
          aria-label={open ? "Chiudi menu" : "Apri menu"}
          onClick={() => setOpen((v) => !v)}
        >
          Menu
        </button>
      </Container>

      {open ? (
        <div className="md:hidden border-t border-black/10 bg-[rgb(var(--bg))]">
          <Container className="py-3 flex flex-col gap-1">
            {items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "focus-ring rounded-xl px-3 py-3 text-sm",
                    isActive
                      ? "bg-neutral-900 text-[rgb(var(--bg))]"
                      : "hover:bg-black/5"
                  )
                }
                end={it.to === "/"}
              >
                {it.label}
              </NavLink>
            ))}
          </Container>
        </div>
      ) : null}
    </header>
  );
}
