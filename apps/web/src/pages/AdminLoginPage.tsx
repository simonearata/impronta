import { useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { Meta } from "../components/Meta";
import { Container } from "../components/Container";
import { Input } from "../components/Input";
import { Button } from "../components/Button";

export function AdminLoginPage() {
  const auth = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();

  const next = useMemo(() => sp.get("next") || "/admin", [sp]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    setError("");

    try {
      setStatus("loading");
      await auth.login(email, password);
      nav(next, { replace: true });
    } catch (err) {
      setStatus("error");
      setError(String((err as Error).message || err));
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

            {status === "error" ? (
              <div className="mt-6 rounded-2xl border border-black/10 bg-black/[0.03] p-4 text-sm text-neutral-900">
                {error}
              </div>
            ) : null}

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
                <div className="text-xs text-neutral-600">
                  Mock: usa le credenziali in `.env`.
                </div>
                <Button
                  type="submit"
                  disabled={status === "loading"}
                  aria-label="Accedi"
                >
                  {status === "loading" ? "Accesso…" : "Accedi"}
                </Button>
              </div>
            </form>
          </div>
        </Container>
      </section>
    </>
  );
}
