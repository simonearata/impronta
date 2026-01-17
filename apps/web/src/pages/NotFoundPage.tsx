import { Link } from "react-router-dom";
import { Container } from "../components/Container";
import { Meta } from "../components/Meta";

export function NotFoundPage() {
  return (
    <>
      <Meta title="Pagina non trovata" path="/404" />
      <section className="py-20">
        <Container>
          <div className="card-surface rounded-2xl p-10 text-center">
            <div className="font-serif text-3xl tracking-tighter2">
              Pagina non trovata
            </div>
            <div className="mt-3 text-sm text-neutral-700">
              L’indirizzo potrebbe essere errato o la pagina è stata spostata.
            </div>
            <div className="mt-8 flex justify-center gap-3">
              <Link
                className="focus-ring rounded-full px-4 py-2 text-sm bg-neutral-900 text-[rgb(var(--bg))]"
                to="/"
              >
                Torna Home
              </Link>
              <Link
                className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5"
                to="/zone"
              >
                Zone
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
