import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../components/Button";
import { Container } from "../components/Container";
import { Input } from "../components/Input";
import { Meta } from "../components/Meta";
import { Textarea } from "../components/Textarea";
import { submitContactLead } from "../data/contact";
import { useSettings } from "../data";
import { ContactLeadInputSchema } from "../shared/contact";

type Form = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

function clean(v: string | null | undefined) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

export function ContactPage() {
  const [sp] = useSearchParams();
  const settings = useSettings();

  const prefillSubject = sp.get("subject") || "";
  const prefillMessage = sp.get("message") || "";

  const [form, setForm] = useState<Form>({
    name: "",
    email: "",
    phone: "",
    subject: prefillSubject,
    message: prefillMessage,
  });

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    return ContactLeadInputSchema.safeParse({
      name: form.name,
      email: form.email,
      phone: form.phone.trim() ? form.phone : undefined,
      subject: form.subject,
      message: form.message,
    }).success;
  }, [form]);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  useEffect(() => {
    if (!prefillSubject && !prefillMessage) return;

    setForm((f) => ({
      ...f,
      subject: f.subject.trim() ? f.subject : prefillSubject,
      message: f.message.trim() ? f.message : prefillMessage,
    }));
  }, [prefillSubject, prefillMessage]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("idle");

    const parsed = ContactLeadInputSchema.safeParse({
      name: form.name,
      email: form.email,
      phone: form.phone.trim() ? form.phone : undefined,
      subject: form.subject,
      message: form.message,
    });

    if (!parsed.success) {
      setStatus("error");
      setError("Controlla i campi: alcuni valori non sono validi.");
      return;
    }

    try {
      setStatus("loading");
      await submitContactLead(parsed.data);
      setStatus("success");
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (err) {
      setStatus("error");
      setError(String((err as Error).message || err));
    }
  }

  const s = settings.data;
  const contactEmail = clean(s?.contactEmail) || "info@impronta.example";
  const phone = clean(s?.phone || null);
  const hours = clean(s?.hours || null);
  const address = clean(s?.address || null);

  const socials = (
    s?.socials && typeof s.socials === "object" ? s.socials : {}
  ) as Record<string, unknown>;

  const instagram = clean(String(socials.instagram ?? ""));
  const whatsapp = clean(String(socials.whatsapp ?? ""));
  const website = clean(String(socials.website ?? ""));

  return (
    <>
      <Meta
        title="Contatti"
        path="/contatti"
        description="Scrivici per informazioni, disponibilità e richieste sui vini."
      />
      <section className="py-16">
        <Container className="max-w-3xl">
          <div className="text-xs text-neutral-600 tracking-wide">CONTATTI</div>
          <h1 className="mt-2 font-serif text-5xl tracking-tighter2">
            Scrivici
          </h1>
          <p className="mt-4 text-sm text-neutral-700 leading-relaxed max-w-2xl">
            Se vuoi informazioni su una referenza o vuoi richiedere
            disponibilità, lasciaci un messaggio. Ti rispondiamo con calma, con
            i dettagli utili.
          </p>

          <div className="mt-10 card-surface rounded-2xl p-8 sm:p-10">
            {status === "success" ? (
              <div className="mb-6 rounded-2xl border border-black/10 bg-black/[0.03] p-4 text-sm text-neutral-900">
                Messaggio inviato. Ti risponderemo il prima possibile.
              </div>
            ) : null}

            {status === "error" ? (
              <div className="mb-6 rounded-2xl border border-black/10 bg-black/[0.03] p-4 text-sm text-neutral-900">
                {error}
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="text-xs text-neutral-600 tracking-wide"
                    htmlFor="c-name"
                  >
                    NOME
                  </label>
                  <Input
                    id="c-name"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                  />
                </div>
                <div>
                  <label
                    className="text-xs text-neutral-600 tracking-wide"
                    htmlFor="c-email"
                  >
                    EMAIL
                  </label>
                  <Input
                    id="c-email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    inputMode="email"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="text-xs text-neutral-600 tracking-wide"
                    htmlFor="c-phone"
                  >
                    TELEFONO (opzionale)
                  </label>
                  <Input
                    id="c-phone"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                </div>
                <div>
                  <label
                    className="text-xs text-neutral-600 tracking-wide"
                    htmlFor="c-subject"
                  >
                    OGGETTO
                  </label>
                  <Input
                    id="c-subject"
                    value={form.subject}
                    onChange={(e) => set("subject", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label
                  className="text-xs text-neutral-600 tracking-wide"
                  htmlFor="c-message"
                >
                  MESSAGGIO
                </label>
                <Textarea
                  id="c-message"
                  rows={6}
                  value={form.message}
                  onChange={(e) => set("message", e.target.value)}
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-4">
                <div className="text-xs text-neutral-600">
                  {status === "loading"
                    ? "Invio in corso…"
                    : "I dati vengono usati solo per risponderti."}
                </div>
                <Button
                  type="submit"
                  disabled={!canSubmit || status === "loading"}
                  aria-label="Invia messaggio"
                >
                  {status === "loading" ? "Invio…" : "Invia"}
                </Button>
              </div>
            </form>
          </div>

          <div className="mt-6 card-surface rounded-2xl p-8 sm:p-10">
            <div className="text-xs text-neutral-600 tracking-wide">INFO</div>
            <h2 className="mt-2 font-serif text-3xl tracking-tighter2">
              Come trovarci
            </h2>

            <div className="mt-6 grid gap-4">
              <div className="flex items-start justify-between gap-6 border-b border-black/10 py-3">
                <div className="text-xs text-neutral-600 tracking-wide">
                  EMAIL
                </div>
                <a
                  className="focus-ring rounded text-sm text-neutral-900 hover:text-neutral-800"
                  href={`mailto:${contactEmail}`}
                >
                  {contactEmail}
                </a>
              </div>

              <div className="flex items-start justify-between gap-6 border-b border-black/10 py-3">
                <div className="text-xs text-neutral-600 tracking-wide">
                  TELEFONO
                </div>
                <div className="text-sm text-neutral-900 text-right">
                  {phone || "—"}
                </div>
              </div>

              <div className="flex items-start justify-between gap-6 border-b border-black/10 py-3">
                <div className="text-xs text-neutral-600 tracking-wide">
                  ORARI
                </div>
                <div className="text-sm text-neutral-900 text-right">
                  {hours || "—"}
                </div>
              </div>

              <div className="flex items-start justify-between gap-6 border-b border-black/10 py-3">
                <div className="text-xs text-neutral-600 tracking-wide">
                  INDIRIZZO
                </div>
                <div className="text-sm text-neutral-900 text-right whitespace-pre-line">
                  {address || "—"}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {website ? (
                <a
                  className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5 hover:bg-black/10 text-neutral-900"
                  href={website}
                  target="_blank"
                  rel="noreferrer"
                >
                  Website
                </a>
              ) : null}
              {instagram ? (
                <a
                  className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5 hover:bg-black/10 text-neutral-900"
                  href={instagram}
                  target="_blank"
                  rel="noreferrer"
                >
                  Instagram
                </a>
              ) : null}
              {whatsapp ? (
                <a
                  className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5 hover:bg-black/10 text-neutral-900"
                  href={whatsapp}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              ) : null}
            </div>

            {settings.error ? (
              <div className="mt-6 text-xs text-neutral-600">
                Non riesco a caricare le info contatto.
              </div>
            ) : settings.isLoading ? (
              <div className="mt-6 text-xs text-neutral-600">
                Caricamento info…
              </div>
            ) : null}
          </div>
        </Container>
      </section>
    </>
  );
}
