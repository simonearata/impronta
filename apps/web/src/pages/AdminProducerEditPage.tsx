import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { AdminImageField } from "../components/AdminImageField";
import { Meta } from "../components/Meta";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Select } from "../components/Select";
import { Input } from "../components/Input";
import { slugify } from "../shared/slug";
import { Textarea } from "../components/Textarea";
import {
  adminDeleteProducer,
  adminUpsertProducer,
  useAdminProducer,
  useAdminZones,
} from "../data/admin";

const FormSchema = z.object({
  zoneId: z.string().min(1),
  name: z.string().min(2),
  slug: z.string().min(2),
  philosophyShort: z.string().min(10),
  storyLong: z.string().min(20),
  location: z.string().optional(),
  website: z.string().url().optional(),
  instagram: z.string().optional(),
  coverImageUrl: z.string().nullable(),
});

type Form = z.infer<typeof FormSchema>;

export function AdminProducerEditPage() {
  const { id } = useParams();
  const isNew = id === "new";
  const nav = useNavigate();

  const producer = useAdminProducer(!isNew ? id : undefined);
  const zones = useAdminZones();

  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const initial = useMemo<Form>(() => {
    return {
      zoneId: "",
      name: "",
      slug: "",
      philosophyShort: "",
      storyLong: "",
      location: "",
      website: "",
      instagram: "",
      coverImageUrl: null,
    };
  }, []);

  const [form, setForm] = useState<Form>(initial);

  useEffect(() => {
    if (isNew) return;
    if (!producer.data) return;
    setForm({
      zoneId: producer.data.zoneId,
      name: producer.data.name,
      slug: producer.data.slug,
      philosophyShort: producer.data.philosophyShort,
      storyLong: producer.data.storyLong,
      location: producer.data.location || "",
      website: producer.data.website || "",
      instagram: producer.data.instagram || "",
      coverImageUrl: producer.data.coverImageUrl,
    });
  }, [isNew, producer.data]);

  useEffect(() => {
    if (!isNew) return;
    if (form.zoneId) return;
    const first = zones.data?.[0];
    if (first) setForm((f) => ({ ...f, zoneId: first.id }));
  }, [isNew, zones.data, form.zoneId]);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSave() {
    setErr("");
    const parsed = FormSchema.safeParse({
      ...form,
      location: form.location?.trim() || undefined,
      website: form.website?.trim() || undefined,
      instagram: form.instagram?.trim() || undefined,
    });

    if (!parsed.success) {
      setErr("Controlla i campi: alcuni valori non sono validi.");
      return;
    }

    try {
      setBusy(true);
      await adminUpsertProducer({
        id: isNew ? "" : String(id),
        ...parsed.data,
        location: parsed.data.location ?? null,
        website: parsed.data.website ?? null,
        instagram: parsed.data.instagram ?? null,
        createdAt: producer.data?.createdAt,
      });
      nav("/admin/aziende", { replace: true });
    } catch (e) {
      setErr(String((e as Error).message || e));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (isNew) return;
    const ok = window.confirm(
      "Eliminare questa azienda? Questa azione non è reversibile."
    );
    if (!ok) return;

    try {
      setBusy(true);
      await adminDeleteProducer(String(id));
      nav("/admin/aziende", { replace: true });
    } catch (e) {
      setErr(String((e as Error).message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Meta
        title={isNew ? "Nuova Azienda" : "Modifica Azienda"}
        path="/admin/aziende"
      />

      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="text-xs text-neutral-600 tracking-wide">AZIENDE</div>
          <h1 className="mt-2 font-serif text-4xl tracking-tighter2">
            {isNew ? "Nuova azienda" : "Modifica azienda"}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5"
            to="/admin/aziende"
          >
            Indietro
          </Link>
          {!isNew ? (
            <button
              className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5"
              onClick={onDelete}
              disabled={busy}
            >
              Elimina
            </button>
          ) : null}
          <Button onClick={onSave} disabled={busy} aria-label="Salva azienda">
            {busy ? "Salvataggio…" : "Salva"}
          </Button>
        </div>
      </div>

      <div className="mt-8">
        {producer.error ? (
          <EmptyState
            title="Errore"
            description={String(producer.error.message || producer.error)}
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

          <div>
            <label
              className="text-xs text-neutral-600 tracking-wide"
              htmlFor="p-zone"
            >
              ZONA
            </label>
            <Select
              id="p-zone"
              value={form.zoneId}
              onChange={(e) => set("zoneId", e.target.value)}
            >
              {(zones.data || []).map((z0) => (
                <option key={z0.id} value={z0.id}>
                  {z0.name} ({z0.country})
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="text-xs text-neutral-600 tracking-wide"
                htmlFor="p-name"
              >
                NOME
              </label>
              <Input
                id="p-name"
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
                htmlFor="p-slug"
              >
                SLUG
              </label>
              <Input
                id="p-slug"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", slugify(e.target.value));
                }}
              />
            </div>
          </div>

          <div>
            <label
              className="text-xs text-neutral-600 tracking-wide"
              htmlFor="p-phil"
            >
              FILOSOFIA BREVE
            </label>
            <Textarea
              id="p-phil"
              rows={3}
              value={form.philosophyShort}
              onChange={(e) => set("philosophyShort", e.target.value)}
            />
          </div>

          <div>
            <label
              className="text-xs text-neutral-600 tracking-wide"
              htmlFor="p-story"
            >
              STORIA / TESTO ESTESO
            </label>
            <Textarea
              id="p-story"
              rows={8}
              value={form.storyLong}
              onChange={(e) => set("storyLong", e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label
                className="text-xs text-neutral-600 tracking-wide"
                htmlFor="p-loc"
              >
                LUOGO
              </label>
              <Input
                id="p-loc"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </div>
            <div>
              <label
                className="text-xs text-neutral-600 tracking-wide"
                htmlFor="p-web"
              >
                WEBSITE
              </label>
              <Input
                id="p-web"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
              />
            </div>
            <div>
              <label
                className="text-xs text-neutral-600 tracking-wide"
                htmlFor="p-ig"
              >
                INSTAGRAM
              </label>
              <Input
                id="p-ig"
                value={form.instagram}
                onChange={(e) => set("instagram", e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
