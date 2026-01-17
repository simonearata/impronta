import { Container } from "./Container";
import { useSettings } from "../data";

function clean(v: unknown) {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export function Footer() {
  const settings = useSettings();

  const s = settings.data;

  const contactEmail = clean(s?.contactEmail) || "info@impronta.example";
  const address = clean(s?.address) || "Roma, Italia";

  return (
    <footer className="border-t border-black/10">
      <Container className="py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="font-serif text-lg">Impronta</div>
            <div className="mt-2 text-sm text-neutral-700 leading-relaxed">
              Un catalogo editoriale di zone, aziende agricole e referenze
              selezionate.
            </div>
          </div>

          <div>
            <div className="text-xs text-neutral-600 tracking-wide">
              CONTATTI
            </div>
            <div className="mt-2 text-sm text-neutral-800">
              <div>{contactEmail}</div>
              <div className="mt-1">{address}</div>
            </div>
          </div>

          <div>
            <div className="text-xs text-neutral-600 tracking-wide">LINK</div>
            <div className="mt-2 flex flex-col gap-2 text-sm">
              <a
                className="focus-ring rounded hover:text-neutral-900 text-neutral-800"
                href="#"
              >
                Privacy
              </a>
              <a
                className="focus-ring rounded hover:text-neutral-900 text-neutral-800"
                href="#"
              >
                Cookie
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 text-xs text-neutral-600">
          © {new Date().getFullYear()} Impronta.
        </div>

        {settings.isLoading ? (
          <div className="mt-2 text-xs text-neutral-600">Caricamento…</div>
        ) : settings.error ? (
          <div className="mt-2 text-xs text-neutral-600">
            Non riesco a caricare i contatti.
          </div>
        ) : null}
      </Container>
    </footer>
  );
}
