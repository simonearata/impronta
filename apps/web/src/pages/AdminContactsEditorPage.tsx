import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Input } from "../components/Input";
import { Meta } from "../components/Meta";
import { Textarea } from "../components/Textarea";
import {
  adminUpdateSettings,
  adminDeleteContactLead,
  useAdminContactLeads,
  useAdminSettings,
} from "../data/admin";
import { SiteSettingsSchema } from "../shared/schemas";
import { DATA_SOURCE } from "../data/config";

type Form = z.infer<typeof SiteSettingsSchema>;

type Lead = {
  id?: string;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  createdAt: string;
};

type Socials = Record<string, string>;

function readLeads(): Lead[] {
  const raw = localStorage.getItem("impronta_contact_leads");
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? (arr as Lead[]) : [];
  } catch {
    return [];
  }
}

function toNullable(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function cleanSocials(socials: unknown): Socials {
  const obj = (socials && typeof socials === "object" ? socials : {}) as Record<
    string,
    unknown
  >;

  const out: Socials = {};
  for (const [k, v] of Object.entries(obj)) {
    const t = String(v ?? "").trim();
    if (t.length) out[k] = t;
  }
  return out;
}

export function AdminContactsEditorPage() {
  const settings = useAdminSettings();
  const leadsApi = useAdminContactLeads();

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [dirty, setDirty] = useState(false);

  const [form, setForm] = useState<Form>({
    contactEmail: "info@impronta.example",
    phone: null,
    address: null,
    hours: null,
    socials: {},
  });

  useEffect(() => {
    if (!settings.data) return;
    if (dirty) return;
    setForm(settings.data);
  }, [settings.data, dirty]);

  // LEADS:
  // - in mock: localStorage (come prima)
  // - in api: SWR via /admin/contact-leads
  const [leadsMock, setLeadsMock] = useState<Lead[]>(() =>
    readLeads().slice(0, 20),
  );

  useEffect(() => {
    if (DATA_SOURCE !== "mock") return;

    const refresh = () => setLeadsMock(readLeads().slice(0, 20));

    refresh();

    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);

    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 1500);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
  }, []);

  const leads: Lead[] =
    DATA_SOURCE === "api"
      ? (leadsApi.data || []).slice(0, 200)
      : leadsMock.slice(0, 20);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setDirty(true);
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setSocial(key: string, value: string) {
    setDirty(true);
    setForm((f) => ({
      ...f,
      socials: {
        ...(f.socials as Socials),
        [key]: value,
      },
    }));
  }

  async function onSave() {
    setErr("");

    const payload: Form = {
      ...form,
      phone: toNullable(form.phone),
      address: toNullable(form.address),
      hours: toNullable(form.hours),
      socials: cleanSocials(form.socials),
    } as Form;

    const parsed = SiteSettingsSchema.safeParse(payload);
    if (!parsed.success) {
      setErr("Controlla i campi: alcuni valori non sono validi.");
      return;
    }

    try {
      setBusy(true);
      await adminUpdateSettings(parsed.data);
      setDirty(false);
      await settings.mutate();
    } catch (e) {
      setErr(String((e as Error).message || e));
    } finally {
      setBusy(false);
    }
  }

  const ig = useMemo(
    () => (cleanSocials(form.socials).instagram ?? "") as string,
    [form.socials],
  );
  const wa = useMemo(
    () => (cleanSocials(form.socials).whatsapp ?? "") as string,
    [form.socials],
  );
  const web = useMemo(
    () => (cleanSocials(form.socials).website ?? "") as string,
    [form.socials],
  );

  return (
    <>
      <Meta title="Admin Contatti" path="/admin/contatti" />
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="text-xs text-neutral-600 tracking-wide">CONTATTI</div>
          <h1 className="mt-2 font-serif text-4xl tracking-tighter2">
            Contatti
          </h1>
        </div>
        <Button onClick={onSave} disabled={busy} aria-label="Salva contatti">
          {busy ? "Salvataggio…" : "Salva"}
        </Button>
      </div>

      <div className="mt-8">
        {settings.error ? (
          <EmptyState
            title="Errore"
            description={String(settings.error.message || settings.error)}
          />
        ) : null}
        {err ? (
          <div className="mb-6 rounded-2xl border border-black/10 bg-black/[0.03] p-4 text-sm text-neutral-900">
            {err}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card-surface rounded-2xl p-8 sm:p-10 grid gap-4 self-start">
            <div>
              <label
                className="text-xs text-neutral-600 tracking-wide"
                htmlFor="s-email"
              >
                EMAIL
              </label>
              <Input
                id="s-email"
                value={form.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  className="text-xs text-neutral-600 tracking-wide"
                  htmlFor="s-phone"
                >
                  TELEFONO
                </label>
                <Input
                  id="s-phone"
                  value={form.phone || ""}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
              <div>
                <label
                  className="text-xs text-neutral-600 tracking-wide"
                  htmlFor="s-hours"
                >
                  ORARI
                </label>
                <Input
                  id="s-hours"
                  value={form.hours || ""}
                  onChange={(e) => set("hours", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label
                className="text-xs text-neutral-600 tracking-wide"
                htmlFor="s-address"
              >
                INDIRIZZO
              </label>
              <Textarea
                id="s-address"
                rows={3}
                value={form.address || ""}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>

            <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-6 grid gap-4">
              <div className="text-xs text-neutral-600 tracking-wide">
                SOCIALS
              </div>

              <div>
                <label
                  className="text-xs text-neutral-600 tracking-wide"
                  htmlFor="s-ig"
                >
                  INSTAGRAM
                </label>
                <Input
                  id="s-ig"
                  value={ig}
                  onChange={(e) => setSocial("instagram", e.target.value)}
                />
              </div>

              <div>
                <label
                  className="text-xs text-neutral-600 tracking-wide"
                  htmlFor="s-wa"
                >
                  WHATSAPP
                </label>
                <Input
                  id="s-wa"
                  value={wa}
                  onChange={(e) => setSocial("whatsapp", e.target.value)}
                />
              </div>

              <div>
                <label
                  className="text-xs text-neutral-600 tracking-wide"
                  htmlFor="s-web"
                >
                  WEBSITE
                </label>
                <Input
                  id="s-web"
                  value={web}
                  onChange={(e) => setSocial("website", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="card-surface rounded-2xl p-8 sm:p-10 self-start">
            <div className="text-xs text-neutral-600 tracking-wide">
              RICHIESTE
            </div>
            <h2 className="mt-2 font-serif text-3xl tracking-tighter2">
              Lead {DATA_SOURCE === "mock" ? "(mock)" : ""}
            </h2>
            <div className="mt-4 text-sm text-neutral-700 leading-relaxed">
              {DATA_SOURCE === "mock"
                ? "In mock arrivano da localStorage del form Contatti. Con backend li leggeremo dal DB."
                : "In api arrivano dal DB via /admin/contact-leads."}
            </div>

            <div className="mt-6 max-h-[600px] overflow-y-auto pr-1 grid gap-3">
              {DATA_SOURCE === "api" && leadsApi.error ? (
                <EmptyState
                  title="Errore"
                  description={String(leadsApi.error.message || leadsApi.error)}
                />
              ) : leads.length === 0 ? (
                <EmptyState
                  title="Nessuna richiesta"
                  description="Invia un messaggio dalla pagina Contatti per vederlo qui."
                />
              ) : (
                leads.map((l, i) => (
                  <div
                    key={(l as any).id ?? i}
                    className="rounded-2xl border border-black/10 bg-black/[0.02] p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-xs text-neutral-600">
                        {new Date(l.createdAt).toLocaleString("it-IT")}
                      </div>
                      <button
                        className="focus-ring rounded-lg px-2 py-1 text-xs border border-black/10 bg-black/5 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition"
                        onClick={async () => {
                          if (!confirm("Eliminare questa richiesta?")) return;
                          try {
                            await adminDeleteContactLead((l as any).id);
                            if (DATA_SOURCE === "mock") {
                              setLeadsMock(readLeads().slice(0, 20));
                            } else {
                              leadsApi.mutate();
                            }
                          } catch (e) {
                            alert(String((e as Error).message || e));
                          }
                        }}
                        aria-label="Elimina richiesta"
                      >
                        Elimina
                      </button>
                    </div>
                    <div className="mt-2 text-sm text-neutral-900">
                      {l.subject}
                    </div>
                    <div className="mt-2 text-xs text-neutral-600">
                      {l.name} · {l.email}
                      {l.phone ? ` · ${l.phone}` : ""}
                    </div>
                    <div className="mt-3 text-sm text-neutral-800 whitespace-pre-wrap">
                      {l.message}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
