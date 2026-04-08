import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Container } from "../components/Container";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Meta } from "../components/Meta";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

/*
  ResetPasswordPage — Pagina raggiunta dal link nell'email di reset

  FLUSSO COMPLETO:
  1. L'admin clicca "Password dimenticata?" nel login
  2. Inserisce l'email → il server genera un token, lo salva nel DB, invia email
  3. L'admin riceve l'email con il link: /admin/reset-password?token=abc123
  4. Apre questa pagina → il token viene letto dalla URL (?token=abc123)
  5. Inserisce la nuova password + conferma
  6. Il frontend manda POST /admin/reset-password { token, newPassword }
  7. Il server verifica il token nel DB, controlla che non sia scaduto
  8. Hasha la nuova password con bcrypt, la salva nel DB
  9. Cancella il token (non può essere riusato)
  10. Invalida tutte le sessioni
  11. L'admin fa login con la nuova password
*/

export function ResetPasswordPage() {
  const [sp] = useSearchParams();
  const token = sp.get("token") || "";

  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [error, setError] = useState("");

  const pwMismatch =
    newPw.length > 0 && confirmPw.length > 0 && newPw !== confirmPw;
  const pwTooShort = newPw.length > 0 && newPw.length < 6;
  const canSubmit =
    token.length > 0 &&
    newPw.length >= 6 &&
    newPw === confirmPw &&
    status !== "loading";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      setStatus("error");
      setError("Token mancante. Usa il link ricevuto via email.");
      return;
    }

    if (newPw !== confirmPw) {
      setStatus("error");
      setError("Le password non coincidono.");
      return;
    }

    try {
      setStatus("loading");
      const res = await fetch(`${API_URL}/admin/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: newPw }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        if (text.includes("scaduto") || text.includes("expired")) {
          throw new Error(
            "Il token è scaduto. Richiedi un nuovo reset dalla pagina di login.",
          );
        }
        if (text.includes("non valido") || text.includes("invalid")) {
          throw new Error(
            "Token non valido. Richiedi un nuovo reset dalla pagina di login.",
          );
        }
        throw new Error("Errore nel reset. Riprova.");
      }

      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "Errore nel reset della password.");
    }
  }

  // Nessun token nella URL
  if (!token) {
    return (
      <>
        <Meta title="Reset Password" path="/admin/reset-password" />
        <section className="py-16">
          <Container className="max-w-xl">
            <div className="card-surface rounded-2xl p-8 sm:p-10 text-center">
              <div
                className="font-serif text-2xl tracking-tighter2"
                style={{ color: "rgb(88, 139, 139)" }}
              >
                Link non valido
              </div>
              <div className="mt-4 text-sm text-neutral-700">
                Questo link non contiene un token di reset. Usa il link che hai
                ricevuto via email, oppure richiedi un nuovo reset.
              </div>
              <div className="mt-6">
                <Link
                  to="/admin/login"
                  className="focus-ring rounded-full px-5 py-2 text-sm font-bold uppercase tracking-wider inline-block"
                  style={{
                    fontFamily: '"Courier New", Courier, monospace',
                    backgroundColor: "#000",
                    color: "rgb(228, 213, 183)",
                  }}
                >
                  Vai al login
                </Link>
              </div>
            </div>
          </Container>
        </section>
      </>
    );
  }

  return (
    <>
      <Meta title="Reset Password" path="/admin/reset-password" />
      <section className="py-16">
        <Container className="max-w-xl">
          <div className="card-surface rounded-2xl p-8 sm:p-10">
            <div className="text-xs text-neutral-600 tracking-wide">
              SICUREZZA
            </div>
            <h1 className="mt-2 font-serif text-4xl tracking-tighter2">
              Nuova password
            </h1>
            <div className="mt-3 text-sm text-neutral-700">
              Inserisci la nuova password per il tuo account admin.
            </div>

            {/* Successo */}
            {status === "success" ? (
              <div className="mt-6">
                <div
                  className="rounded-2xl border p-4 text-sm"
                  style={{
                    borderColor: "rgba(88, 139, 139, 0.3)",
                    backgroundColor: "rgba(88, 139, 139, 0.06)",
                    color: "rgb(88, 139, 139)",
                  }}
                >
                  Password reimpostata con successo.
                </div>
                <div className="mt-6 text-center">
                  <Link
                    to="/admin/login"
                    className="focus-ring rounded-full px-5 py-2 text-sm font-bold uppercase tracking-wider inline-block"
                    style={{
                      fontFamily: '"Courier New", Courier, monospace',
                      backgroundColor: "#000",
                      color: "rgb(228, 213, 183)",
                    }}
                  >
                    Vai al login
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Errore */}
                {status === "error" && error ? (
                  <div
                    className="mt-6 rounded-2xl border p-4 text-sm"
                    style={{
                      borderColor: "rgba(200, 60, 60, 0.3)",
                      backgroundColor: "rgba(200, 60, 60, 0.06)",
                      color: "rgb(160, 40, 40)",
                    }}
                  >
                    {error}
                  </div>
                ) : null}

                {/* Form */}
                <form onSubmit={onSubmit} className="mt-8 grid gap-4">
                  <div>
                    <label
                      className="text-xs text-neutral-600 tracking-wide"
                      htmlFor="rp-new"
                    >
                      NUOVA PASSWORD
                    </label>
                    <Input
                      id="rp-new"
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

                  <div>
                    <label
                      className="text-xs text-neutral-600 tracking-wide"
                      htmlFor="rp-confirm"
                    >
                      CONFERMA PASSWORD
                    </label>
                    <Input
                      id="rp-confirm"
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

                  <div className="pt-2 flex items-center justify-between gap-4">
                    <Link
                      to="/admin/login"
                      className="text-xs underline transition"
                      style={{ color: "rgb(88, 139, 139)" }}
                    >
                      Torna al login
                    </Link>
                    <Button
                      type="submit"
                      disabled={!canSubmit}
                      aria-label="Reimposta password"
                    >
                      {status === "loading"
                        ? "Salvataggio…"
                        : "Reimposta password"}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
