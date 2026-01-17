import { Link } from "react-router-dom";
import { Meta } from "../components/Meta";
import { cn } from "../shared/utils";

function CardLink({
  to,
  title,
  desc,
}: {
  to: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "focus-ring card-surface rounded-2xl p-6 block hover:bg-black/[0.02] transition"
      )}
    >
      <div className="font-serif text-2xl tracking-tighter2">{title}</div>
      <div className="mt-2 text-sm text-neutral-800 leading-relaxed">
        {desc}
      </div>
    </Link>
  );
}

export function AdminDashboardPage() {
  return (
    <>
      <Meta title="Admin" path="/admin" />
      <div>
        <div className="text-xs text-neutral-600 tracking-wide">DASHBOARD</div>
        <h1 className="mt-2 font-serif text-4xl tracking-tighter2">Gestione</h1>
        <div className="mt-3 text-sm text-neutral-700 max-w-2xl leading-relaxed">
          Aggiorna contenuti editoriali e catalogo. In mock le modifiche restano
          in localStorage.
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <CardLink
            to="/admin/zone"
            title="Zone"
            desc="Crea e aggiorna territori, descrizioni e immagini di copertina."
          />
          <CardLink
            to="/admin/aziende"
            title="Aziende"
            desc="Gestisci aziende agricole: filosofia, storia, links e appartenenza alla zona."
          />
          <CardLink
            to="/admin/vini"
            title="Vini"
            desc="Referenze: tipologia, annata, note, prezzo e disponibilità."
          />
          <CardLink
            to="/admin/home"
            title="Home"
            desc="Hero, quote e sezioni editoriali (Story, Vision, Mission), selezioni in evidenza."
          />
          <CardLink
            to="/admin/contatti"
            title="Contatti"
            desc="Email/telefono/indirizzo/orari e social. Visualizza richieste (mock)."
          />
        </div>
      </div>
    </>
  );
}
