import { useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { Meta } from "../components/Meta";
import { Container } from "../components/Container";
import { Input } from "../components/Input";
import { Button } from "../components/Button";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const MODE = (import.meta.env.VITE_DATA_SOURCE || "mock") as "mock" | "api";

export function AdminLoginPage() {
  const auth = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const next = useMemo(() => sp.get("next") || "/admin", [sp]);

  // Login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  // Reset password form
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState<
    "idle" | "loading" | "sent" | "error"
  >("idle");
  const [resetError, setResetError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validazione frontend leggibile
    if (!email.trim()) {
      setStatus("error");
      setError("Inserisci l'email.");
      return;
    }
    if (!password) {
      setStatus("error");
      setError("Inserisci la password.");
      return;
    }

    try {
      setStatus("loading");
      await auth.login(email, password);
      nav(next, { replace: true });
    } catch (err: any) {
      setStatus("error");
      // Mostra un messaggio pulito, non il JSON di Zod
      const msg = err?.message || String(err);
      if (msg.includes("Credenziali") || msg.includes("401")) {
        setError("Email o password non corretti.");
      } else if (msg.includes("fetch") || msg.includes("network")) {
        setError("Impossibile contattare il server. Riprova.");
      } else {
        setError("Credenziali non valide.");
      }
    }
  }

  async function onRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setResetError("");

    if (!resetEmail.trim() || !resetEmail.includes("@")) {
      setResetStatus("error");
      setResetError("Inserisci un'email valida.");
      return;
    }

    if (MODE !== "api" || !API_URL) {
      setResetStatus("error");
      setResetError(
        "Il recupero password è disponibile solo con il backend attivo.",
      );
      return;
    }

    try {
      setResetStatus("loading");
      const res = await fetch(`${API_URL}/admin/request-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });

      if (!res.ok) {
        throw new Error("Errore nella richiesta.");
      }

      setResetStatus("sent");
    } catch {
      setResetStatus("error");
      setResetError("Errore nella richiesta. Riprova.");
    }
  }

  if (auth.isAuthenticated) {
    return <Navigate to={next} replace />;
  }

  return (
    <>
      <Meta title="Admin Login" path="/admin/login" />
      <section className="py-16">
        <Container className="max-w-xl">
          <div className="card-surface rounded-2xl p-8 sm:p-10">
            <div className="text-xs text-neutral-600 tracking-wide">ADMIN</div>
            <h1 className="mt-2 font-serif text-4xl tracking-tighter2">
              Login
            </h1>
            <div className="mt-3 text-sm text-neutral-700">
              Accedi per gestire contenuti e catalogo.
            </div>

            {!showReset ? (
              <>
                {/* ── Errore login ── */}
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

                {/* ── Form login ── */}
                <form onSubmit={onSubmit} className="mt-8 grid gap-4">
                  <div>
                    <label
                      className="text-xs text-neutral-600 tracking-wide"
                      htmlFor="a-email"
                    >
                      EMAIL
                    </label>
                    <Input
                      id="a-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      inputMode="email"
                    />
                  </div>

                  <div>
                    <label
                      className="text-xs text-neutral-600 tracking-wide"
                      htmlFor="a-pass"
                    >
                      PASSWORD
                    </label>
                    <Input
                      id="a-pass"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-4">
                    <button
                      type="button"
                      className="text-xs underline transition"
                      style={{ color: "rgb(88, 139, 139)" }}
                      onClick={() => {
                        setShowReset(true);
                        setResetEmail(email);
                        setResetStatus("idle");
                        setResetError("");
                      }}
                    >
                      Password dimenticata?
                    </button>
                    <Button
                      type="submit"
                      disabled={status === "loading"}
                      aria-label="Accedi"
                    >
                      {status === "loading" ? "Accesso…" : "Accedi"}
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <>
                {/* ── Reset password ── */}
                {resetStatus === "sent" ? (
                  <div
                    className="mt-6 rounded-2xl border p-4 text-sm"
                    style={{
                      borderColor: "rgba(88, 139, 139, 0.3)",
                      backgroundColor: "rgba(88, 139, 139, 0.06)",
                      color: "rgb(88, 139, 139)",
                    }}
                  >
                    Se l'email è associata a un account admin, riceverai
                    un'email con il link per reimpostare la password. Controlla
                    anche la cartella spam.
                  </div>
                ) : null}

                {resetStatus === "error" && resetError ? (
                  <div
                    className="mt-6 rounded-2xl border p-4 text-sm"
                    style={{
                      borderColor: "rgba(200, 60, 60, 0.3)",
                      backgroundColor: "rgba(200, 60, 60, 0.06)",
                      color: "rgb(160, 40, 40)",
                    }}
                  >
                    {resetError}
                  </div>
                ) : null}

                <form onSubmit={onRequestReset} className="mt-8 grid gap-4">
                  <div className="text-sm text-neutral-700">
                    Inserisci l'email dell'account admin. Riceverai un token per
                    reimpostare la password.
                  </div>
                  <div>
                    <label
                      className="text-xs text-neutral-600 tracking-wide"
                      htmlFor="r-email"
                    >
                      EMAIL
                    </label>
                    <Input
                      id="r-email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      autoComplete="email"
                      inputMode="email"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-4">
                    <button
                      type="button"
                      className="text-xs underline transition"
                      style={{ color: "rgb(88, 139, 139)" }}
                      onClick={() => {
                        setShowReset(false);
                        setError("");
                        setStatus("idle");
                      }}
                    >
                      Torna al login
                    </button>
                    <Button
                      type="submit"
                      disabled={
                        resetStatus === "loading" || resetStatus === "sent"
                      }
                      aria-label="Invia richiesta reset"
                    >
                      {resetStatus === "loading"
                        ? "Invio…"
                        : "Recupera password"}
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
