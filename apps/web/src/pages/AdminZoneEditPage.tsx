import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { AdminImageField } from "../components/AdminImageField";
import { Meta } from "../components/Meta";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { Input } from "../components/Input";
import { slugify } from "../shared/slug";
import { Textarea } from "../components/Textarea";
import { adminDeleteZone, adminUpsertZone, useAdminZone } from "../data/admin";

const FormSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  country: z.string().min(2),
  region: z.string().min(2),
  descriptionShort: z.string().min(10),
  descriptionLong: z.string().min(20),
  coverImageUrl: z.string().nullable(),
});

type Form = z.infer<typeof FormSchema>;

export function AdminZoneEditPage() {
  const { id } = useParams();
  const isNew = id === "new";
  const nav = useNavigate();

  const zone = useAdminZone(!isNew ? id : undefined);

  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const initial = useMemo<Form>(() => {
    return {
      name: "",
      slug: "",
      country: "",
      region: "",
      descriptionShort: "",
      descriptionLong: "",
      coverImageUrl: null,
    };
  }, []);

  const [form, setForm] = useState<Form>(initial);

  useEffect(() => {
    if (isNew) return;
    if (!zone.data) return;
    setForm({
      name: zone.data.name,
      slug: zone.data.slug,
      country: zone.data.country,
      region: zone.data.region,
      descriptionShort: zone.data.descriptionShort,
      descriptionLong: zone.data.descriptionLong,
      coverImageUrl: zone.data.coverImageUrl,
    });
  }, [isNew, zone.data]);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSave() {
    setErr("");
    const parsed = FormSchema.safeParse(form);
    if (!parsed.success) {
      const fields = parsed.error.issues
        .map((i) => i.path.join("."))
        .join(", ");
      setErr(
        `Campi non validi: ${fields}. Controlla lunghezze minime (nome ≥2, slug ≥2, paese ≥2, regione ≥2, desc. breve ≥10, desc. estesa ≥20).`,
      );
      return;
    }

    try {
      setBusy(true);
      await adminUpsertZone({
        id: isNew ? "" : String(id),
        ...parsed.data,
        createdAt: zone.data?.createdAt,
      });
      nav("/admin/zone", { replace: true });
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
      await adminDeleteZone(String(id));
      nav("/admin/zone", { replace: true });
    } catch (e) {
      setErr(String((e as Error).message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Meta title={isNew ? "Nuova Zona" : "Modifica Zona"} path="/admin/zone" />

      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="text-xs text-neutral-600 tracking-wide">ZONE</div>
          <h1 className="mt-2 font-serif text-4xl tracking-tighter2">
            {isNew ? "Nuova zona" : "Modifica zona"}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5"
            to="/admin/zone"
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
          <Button onClick={onSave} disabled={busy} aria-label="Salva zona">
            {busy ? "Salvataggio…" : "Salva"}
          </Button>
        </div>
      </div>

      <div className="mt-8">
        {zone.error ? (
          <EmptyState
            title="Errore"
            description={String(zone.error.message || zone.error)}
          />
        ) : null}
        {err ? (
          <div className="mb-6 rounded-2xl border border-black/10 bg-black/[0.03] p-4 text-sm text-neutral-900">
            {err}
          </div>
        ) : null}

        <div className="card-surface rounded-2xl p-8 sm:p-10 grid gap-6">
          <AdminImageField
            label="Cover image"
            value={form.coverImageUrl}
            onChange={(v) => set("coverImageUrl", v)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="text-xs text-neutral-600 tracking-wide"
                htmlFor="z-name"
              >
                NOME
              </label>
              <Input
                id="z-name"
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
                htmlFor="z-slug"
              >
                SLUG
              </label>
              <Input
                id="z-slug"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", slugify(e.target.value));
                }}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="text-xs text-neutral-600 tracking-wide"
                htmlFor="z-country"
              >
                PAESE
              </label>
              <Input
                id="z-country"
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
              />
            </div>

            <div>
              <label
                className="text-xs text-neutral-600 tracking-wide"
                htmlFor="z-region"
              >
                REGIONE
              </label>
              <Input
                id="z-region"
                value={form.region}
                onChange={(e) => set("region", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label
              className="text-xs text-neutral-600 tracking-wide"
              htmlFor="z-short"
            >
              DESCRIZIONE BREVE
            </label>
            <Textarea
              id="z-short"
              rows={3}
              value={form.descriptionShort}
              onChange={(e) => set("descriptionShort", e.target.value)}
            />
          </div>

          <div>
            <label
              className="text-xs text-neutral-600 tracking-wide"
              htmlFor="z-long"
            >
              DESCRIZIONE ESTESA
            </label>
            <Textarea
              id="z-long"
              rows={8}
              value={form.descriptionLong}
              onChange={(e) => set("descriptionLong", e.target.value)}
            />
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Elimina zona"
        message="Questa azione è permanente e non può essere annullata. La zona verrà rimossa dal database."
        onConfirm={() => { setConfirmOpen(false); onDelete(); }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
