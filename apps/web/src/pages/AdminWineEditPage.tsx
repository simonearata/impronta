import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { AdminImageField } from "../components/AdminImageField";
import type { WineType } from "../shared/types";
import { Meta } from "../components/Meta";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { Select } from "../components/Select";
import { Input } from "../components/Input";
import { slugify } from "../shared/slug";
import { Textarea } from "../components/Textarea";
import {
  adminDeleteWine,
  adminUpsertWine,
  useAdminProducers,
  useAdminWine,
  useAdminWineStock,
  wineTypeOptions,
} from "../data/admin";

const FormSchema = z.object({
  producerId: z.string().min(1),
  name: z.string().min(2),
  slug: z.string().min(2),
  vintage: z.string().optional(),
  type: z.custom<WineType>(),
  grapes: z.string().optional(),
  alcohol: z.string().optional(),
  vinification: z.string().optional(),
  tastingNotes: z.string().optional(),
  pairing: z.string().optional(),
  priceEur: z.string().optional(),
  isAvailable: z.boolean(),
  bottleSizeMl: z.string().optional(),
  imageUrl: z.string().nullable(),
});

type Form = z.infer<typeof FormSchema>;

export function AdminWineEditPage() {
  const { id } = useParams();
  const isNew = id === "new";
  const nav = useNavigate();

  const wine = useAdminWine(!isNew ? id : undefined);
  const producers = useAdminProducers();
  const stock = useAdminWineStock(!isNew ? id : undefined);

  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const initial = useMemo<Form>(() => {
    return {
      producerId: "",
      name: "",
      slug: "",
      vintage: "",
      type: "red",
      grapes: "",
      alcohol: "",
      vinification: "",
      tastingNotes: "",
      pairing: "",
      priceEur: "",
      isAvailable: true,
      bottleSizeMl: "750",
      imageUrl: null,
    };
  }, []);

  const [form, setForm] = useState<Form>(initial);

  useEffect(() => {
    if (!isNew) return;
    if (form.producerId) return;
    const first = producers.data?.[0];
    if (first) setForm((f) => ({ ...f, producerId: first.id }));
  }, [isNew, producers.data, form.producerId]);

  useEffect(() => {
    if (isNew) return;
    if (!wine.data) return;

    const eur =
      wine.data.priceCents == null
        ? ""
        : String((wine.data.priceCents / 100).toFixed(2));
    const b =
      wine.data.bottleSizeMl == null ? "" : String(wine.data.bottleSizeMl);
    const v = wine.data.vintage == null ? "" : String(wine.data.vintage);

    setForm({
      producerId: wine.data.producerId,
      name: wine.data.name,
      slug: wine.data.slug,
      vintage: v,
      type: wine.data.type,
      grapes: wine.data.grapes || "",
      alcohol: wine.data.alcohol || "",
      vinification: wine.data.vinification || "",
      tastingNotes: wine.data.tastingNotes || "",
      pairing: wine.data.pairing || "",
      priceEur: eur,
      isAvailable: wine.data.isAvailable,
      bottleSizeMl: b || "750",
      imageUrl: wine.data.imageUrl,
    });
  }, [isNew, wine.data]);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSave() {
    setErr("");

    const parsed = FormSchema.safeParse(form);
    if (!parsed.success) {
      const fields = parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      setErr(`Campi non validi: ${fields}`);
      return;
    }

    const v = parsed.data.vintage?.trim();
    const vintage = v ? Number(v) : null;
    if (v && !Number.isFinite(vintage)) {
      setErr("Annata non valida.");
      return;
    }

    const p = parsed.data.priceEur?.trim();
    const priceCents = p ? Math.round(Number(p) * 100) : null;
    if (p && !Number.isFinite(priceCents)) {
      setErr("Prezzo non valido.");
      return;
    }

    const b = parsed.data.bottleSizeMl?.trim();
    const bottleSizeMl = b ? Number(b) : null;
    if (b && !Number.isFinite(bottleSizeMl)) {
      setErr("Formato bottiglia non valido.");
      return;
    }

    try {
      setBusy(true);
      await adminUpsertWine({
        id: isNew ? "" : String(id),
        producerId: parsed.data.producerId,
        name: parsed.data.name,
        slug: parsed.data.slug,
        vintage: vintage == null ? null : Math.trunc(vintage),
        type: parsed.data.type,
        grapes: parsed.data.grapes?.trim() || null,
        alcohol: parsed.data.alcohol?.trim() || null,
        vinification: parsed.data.vinification?.trim() || null,
        tastingNotes: parsed.data.tastingNotes?.trim() || null,
        pairing: parsed.data.pairing?.trim() || null,
        priceCents: priceCents == null ? null : Math.trunc(priceCents),
        isAvailable: parsed.data.isAvailable,
        bottleSizeMl: bottleSizeMl == null ? null : Math.trunc(bottleSizeMl),
        imageUrl: parsed.data.imageUrl ?? null,
        createdAt: wine.data?.createdAt,
      });
      nav("/admin/vini", { replace: true });
    } catch (e) {
      setErr(String((e as Error).message || e));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (isNew) return;
    try {
      setBusy(true);
      await adminDeleteWine(String(id));
      nav("/admin/vini", { replace: true });
    } catch (e) {
      setErr(String((e as Error).message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Meta title={isNew ? "Nuovo Vino" : "Modifica Vino"} path="/admin/vini" />

      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="text-xs text-neutral-600 tracking-wide">VINI</div>
          <h1 className="mt-2 font-serif text-4xl tracking-tighter2">
            {isNew ? "Nuovo vino" : "Modifica vino"}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5"
            to="/admin/vini"
          >
            Indietro
          </Link>
          {!isNew ? (
            <button
              className="focus-ring rounded-full px-4 py-2 text-sm border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              onClick={() => setConfirmOpen(true)}
              disabled={busy}
            >
              Elimina
            </button>
          ) : null}
          <Button onClick={onSave} disabled={busy} aria-label="Salva vino">
            {busy ? "Salvataggio…" : "Salva"}
          </Button>
        </div>
      </div>

      <div className="mt-8">
        {wine.error ? (
          <EmptyState
            title="Errore"
            description={String(wine.error.message || wine.error)}
          />
        ) : null}
        {err ? (
          <div className="mb-6 rounded-2xl border border-black/10 bg-black/[0.03] p-4 text-sm text-neutral-900">
            {err}
          </div>
        ) : null}

        <div className="card-surface rounded-2xl p-8 sm:p-10 grid gap-6">
          <AdminImageField
            label="Immagine vino"
            value={form.imageUrl}
            onChange={(v) => set("imageUrl", v)}
          />

          <div>
            <label
              className="text-xs text-neutral-600 tracking-wide"
              htmlFor="w-prod"
            >
              AZIENDA
            </label>
            <Select
              id="w-prod"
              value={form.producerId}
              onChange={(e) => set("producerId", e.target.value)}
            >
              {(producers.data || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="text-xs text-neutral-600 tracking-wide"
                htmlFor="w-name"
              >
                NOME
              </label>
              <Input
                id="w-name"
                value={form.name}
                onChange={(e) => {
                  const v = e.target.value;
                  set("name", v);
                  if (!slugTouched) set("slug", slugify(v));
                }}
              />
            </div>

            <div>
              <label
                className="text-xs text-neutral-600 tracking-wide"
                htmlFor="w-slug"
              >
                SLUG
              </label>
              <Input
                id="w-slug"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", slugify(e.target.value));
                }}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label
                className="text-xs text-neutral-600 tracking-wide"
                htmlFor="w-type"
              >
                TIPOLOGIA
              </label>
              <Select
                id="w-type"
                value={form.type}
                onChange={(e) => set("type", e.target.value as WineType)}
              >
                {wineTypeOptions().map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label
                className="text-xs text-neutral-600 tracking-wide"
                htmlFor="w-vintage"
              >
                ANNATA
              </label>
              <Input
                id="w-vintage"
                value={form.vintage}
                onChange={(e) => set("vintage", e.target.value)}
                placeholder="es. 2024"
              />
            </div>

            <div>
              <label
                className="text-xs text-neutral-600 tracking-wide"
                htmlFor="w-price"
              >
                PREZZO (EUR)
              </label>
              <Input
                id="w-price"
                value={form.priceEur}
                onChange={(e) => set("priceEur", e.target.value)}
                placeholder="es. 18.00"
              />
            </div>

            <div>
              <label
                className="text-xs text-neutral-600 tracking-wide"
                htmlFor="w-size"
              >
                FORMATO (ML)
              </label>
              <Input
                id="w-size"
                value={form.bottleSizeMl}
                onChange={(e) => set("bottleSizeMl", e.target.value)}
                placeholder="750"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-black/[0.02] p-4">
            <div>
              <div className="text-xs text-neutral-600 tracking-wide">
                DISPONIBILITÀ
              </div>
              <div className="mt-1 text-sm text-neutral-900">
                {form.isAvailable ? "Disponibile" : "Non disponibile"}
              </div>
            </div>
            <label className="flex items-center gap-3">
              <span className="text-sm text-neutral-700">Toggle</span>
              <input
                className="h-5 w-5"
                type="checkbox"
                checked={form.isAvailable}
                onChange={(e) => set("isAvailable", e.target.checked)}
                aria-label="Disponibile"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="text-xs text-neutral-600 tracking-wide"
                htmlFor="w-grapes"
              >
                VARIETÀ
              </label>
              <Input
                id="w-grapes"
                value={form.grapes}
                onChange={(e) => set("grapes", e.target.value)}
              />
            </div>

            <div>
              <label
                className="text-xs text-neutral-600 tracking-wide"
                htmlFor="w-alc"
              >
                ALCOL
              </label>
              <Input
                id="w-alc"
                value={form.alcohol}
                onChange={(e) => set("alcohol", e.target.value)}
                placeholder="es. 12.5%"
              />
            </div>
          </div>

          <div>
            <label
              className="text-xs text-neutral-600 tracking-wide"
              htmlFor="w-vinif"
            >
              VINIFICAZIONE
            </label>
            <Textarea
              id="w-vinif"
              rows={3}
              value={form.vinification}
              onChange={(e) => set("vinification", e.target.value)}
            />
          </div>

          <div>
            <label
              className="text-xs text-neutral-600 tracking-wide"
              htmlFor="w-notes"
            >
              NOTE DI DEGUSTAZIONE
            </label>
            <Textarea
              id="w-notes"
              rows={3}
              value={form.tastingNotes}
              onChange={(e) => set("tastingNotes", e.target.value)}
            />
          </div>

          <div>
            <label
              className="text-xs text-neutral-600 tracking-wide"
              htmlFor="w-pair"
            >
              ABBINAMENTI
            </label>
            <Textarea
              id="w-pair"
              rows={3}
              value={form.pairing}
              onChange={(e) => set("pairing", e.target.value)}
            />
          </div>
        </div>
      </div>

      {!isNew && (
        <div className="mt-6 card-surface rounded-2xl p-8">
          <div className="flex items-center justify-between gap-6">
            <div>
              <div className="text-xs text-neutral-600 tracking-wide">STOCK</div>
              <div className="mt-1 flex items-baseline gap-3">
                <span className={`font-mono text-4xl font-semibold ${stock.data != null && stock.data < 0 ? "text-red-600" : stock.data === 0 ? "text-neutral-400" : "text-neutral-900"}`}>
                  {stock.isLoading ? "—" : (stock.data ?? 0)}
                </span>
                <span className="text-sm text-neutral-500">bottiglie disponibili</span>
              </div>
            </div>
            <Link
              className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5 whitespace-nowrap"
              to="/admin/magazzino"
            >
              Vai al magazzino
            </Link>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Elimina vino"
        message="Questa azione è permanente e non può essere annullata. Il vino verrà rimosso dal database."
        onConfirm={() => { setConfirmOpen(false); onDelete(); }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
