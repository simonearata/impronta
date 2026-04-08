import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Meta } from "../components/Meta";
import { cn } from "../shared/utils";
import { adminChangePassword } from "../data/admin";
import { useAuth } from "../auth/AuthProvider";

/*
  AdminDashboardPage — Pagina principale dell'admin

  CONTIENE:
  1. Link rapidi alle sezioni di gestione (zone, aziende, vini, home, contatti)
  2. Sezione CAMBIO PASSWORD con:
     - Campo "password attuale" → per verificare che sei tu
     - Campo "nuova password" → la password che vuoi impostare
     - Campo "conferma nuova password" → per evitare errori di battitura
     - Bottone "Cambia password" → chiama POST /admin/change-password
     - Dopo il cambio, il server invalida TUTTE le sessioni → vieni forzato al re-login

  COME FUNZIONA IL CAMBIO PASSWORD:
  1. Il frontend manda { currentPassword, newPassword } al backend
  2. Il backend verifica che currentPassword corrisponda a quella attuale (env var ADMIN_PASSWORD)
  3. Se corretta, il backend aggiorna process.env.ADMIN_PASSWORD con la nuova password
  4. Il backend svuota TUTTE le sessioni (accessSessions.clear() + refreshSessions.clear())
  5. Il frontend riceve "ok" → esegue logout → ti rimanda alla pagina di login
  6. Fai login con la nuova password

  NOTA: la password aggiornata vive in process.env (in memoria).
  Se il server si riavvia, torna la password originale delle env vars di Render.
  Per renderla permanente, devi anche aggiornarla su Render → Environment.
*/

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
        "focus-ring card-surface rounded-2xl p-6 block hover:bg-black/[0.02] transition",
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
  const auth = useAuth();

  // Stati del form cambio password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  // Validazione frontend
  const pwMismatch =
    newPw.length > 0 && confirmPw.length > 0 && newPw !== confirmPw;
  const pwTooShort = newPw.length > 0 && newPw.length < 6;
  const canSubmitPw =
    currentPw.length > 0 && newPw.length >= 6 && newPw === confirmPw && !pwBusy;

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);

    // Doppia verifica frontend
    if (newPw !== confirmPw) {
      setPwError("Le password non coincidono.");
      return;
    }
    if (newPw.length < 6) {
      setPwError("La nuova password deve avere almeno 6 caratteri.");
      return;
    }

    try {
      setPwBusy(true);
      // Chiama il backend: POST /admin/change-password
      await adminChangePassword(currentPw, newPw);
      setPwSuccess(true);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");

      // Il server ha invalidato tutte le sessioni → forza logout dopo 2 secondi
      setTimeout(async () => {
        await auth.logout();
      }, 2000);
    } catch (err) {
      setPwError(String((err as Error).message || err));
    } finally {
      setPwBusy(false);
    }
  }

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

        {/* ── Link rapidi alle sezioni ─────────── */}
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
            desc="Email/telefono/indirizzo/orari e social. Visualizza richieste."
          />
        </div>

        {/* ── Cambio Password ─────────────────── */}
        <div className="mt-12">
          <div className="text-xs text-neutral-600 tracking-wide">
            SICUREZZA
          </div>
          <h2 className="mt-2 font-serif text-3xl tracking-tighter2">
            Cambia password
          </h2>
          <div className="mt-3 text-sm text-neutral-700 max-w-2xl leading-relaxed">
            Dopo il cambio verrai disconnesso e dovrai fare login con la nuova
            password. Ricorda di aggiornare anche la variabile ADMIN_PASSWORD su
            Render per renderla permanente.
          </div>

          <div className="mt-6 card-surface rounded-2xl p-8 sm:p-10 max-w-lg">
            {/* Messaggio di successo */}
            {pwSuccess ? (
              <div
                className="mb-6 rounded-2xl border p-4 text-sm"
                style={{
                  borderColor: "rgba(88, 139, 139, 0.3)",
                  backgroundColor: "rgba(88, 139, 139, 0.06)",
                  color: "rgb(88, 139, 139)",
                }}
              >
                Password cambiata con successo. Verrai reindirizzato al login...
              </div>
            ) : null}

            {/* Messaggio di errore */}
            {pwError ? (
              <div
                className="mb-6 rounded-2xl border p-4 text-sm"
                style={{
                  borderColor: "rgba(200, 60, 60, 0.3)",
                  backgroundColor: "rgba(200, 60, 60, 0.06)",
                  color: "rgb(180, 50, 50)",
                }}
              >
                {pwError}
              </div>
            ) : null}

            <form onSubmit={handleChangePassword} className="grid gap-4">
              {/* Password attuale */}
              <div>
                <label
                  className="text-xs text-neutral-600 tracking-wide"
                  htmlFor="pw-current"
                >
                  PASSWORD ATTUALE
                </label>
                <Input
                  id="pw-current"
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              {/* Nuova password */}
              <div>
                <label
                  className="text-xs text-neutral-600 tracking-wide"
                  htmlFor="pw-new"
                >
                  NUOVA PASSWORD
                </label>
                <Input
                  id="pw-new"
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  autoComplete="new-password"
                />
                {pwTooShort ? (
                  <div
                    className="mt-1 text-xs"
                    style={{ color: "rgb(180, 50, 50)" }}
                  >
                    Minimo 6 caratteri
                  </div>
                ) : null}
              </div>

              {/* Conferma nuova password */}
              <div>
                <label
                  className="text-xs text-neutral-600 tracking-wide"
                  htmlFor="pw-confirm"
                >
                  CONFERMA NUOVA PASSWORD
                </label>
                <Input
                  id="pw-confirm"
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  autoComplete="new-password"
                />
                {pwMismatch ? (
                  <div
                    className="mt-1 text-xs"
                    style={{ color: "rgb(180, 50, 50)" }}
                  >
                    Le password non coincidono
                  </div>
                ) : null}
              </div>

              {/* Bottone */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={!canSubmitPw}
                  aria-label="Cambia password"
                >
                  {pwBusy ? "Cambio in corso…" : "Cambia password"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
