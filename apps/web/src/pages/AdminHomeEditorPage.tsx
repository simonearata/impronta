import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { AdminImageField } from "../components/AdminImageField";
import { HomeContentSchema } from "../shared/schemas";
import {
  adminUpdateHome,
  useAdminHome,
  useAdminProducers,
  useAdminZones,
} from "../data/admin";
import { Meta } from "../components/Meta";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Textarea } from "../components/Textarea";

type Form = z.infer<typeof HomeContentSchema>;

export function AdminHomeEditorPage() {
  const home = useAdminHome();
  const zones = useAdminZones();
  const producers = useAdminProducers();

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const empty = useMemo<Form>(() => {
    return {
      heroImageUrl: null,
      heroQuote: "",
      story: "",
      vision: "",
      mission: "",
      featuredZoneIds: [],
      featuredProducerIds: [],
    };
  }, []);

  const [form, setForm] = useState<Form>(empty);

  useEffect(() => {
    if (!home.data) return;
    setForm(home.data);
  }, [home.data]);

  function toggle(list: string[], id: string) {
    return list.includes(id) ? list.filter((x) => x !== id) : [id, ...list];
  }

  async function onSave() {
    setErr("");
    const parsed = HomeContentSchema.safeParse(form);
    if (!parsed.success) {
      const fields = parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      setErr(`Campi non validi: ${fields}`);
      return;
    }

    try {
      setBusy(true);
      await adminUpdateHome(parsed.data);
      await home.mutate();
    } catch (e) {
      setErr(String((e as Error).message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Meta title="Admin Home" path="/admin/home" />
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="text-xs text-neutral-600 tracking-wide">HOME</div>
          <h1 className="mt-2 font-serif text-4xl tracking-tighter2">Home</h1>
        </div>
        <Button onClick={onSave} disabled={busy} aria-label="Salva home">
          {busy ? "Salvataggio…" : "Salva"}
        </Button>
      </div>

      <div className="mt-8">
        {home.error ? (
          <EmptyState
            title="Errore"
            description={String(home.error.message || home.error)}
          />
        ) : null}
        {err ? (
          <div className="mb-6 rounded-2xl border border-black/10 bg-black/[0.03] p-4 text-sm text-neutral-900">
            {err}
          </div>
        ) : null}

        <div className="card-surface rounded-2xl p-8 sm:p-10 grid gap-6">
          <AdminImageField
            label="Hero image"
            value={form.heroImageUrl}
            onChange={(v) => setForm((f) => ({ ...f, heroImageUrl: v }))}
          />

          <div>
            <label
              className="text-xs text-neutral-600 tracking-wide"
              htmlFor="h-quote"
            >
              HERO QUOTE
            </label>
            <Textarea
              id="h-quote"
              rows={2}
              value={form.heroQuote}
              onChange={(e) =>
                setForm((f) => ({ ...f, heroQuote: e.target.value }))
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label
                className="text-xs text-neutral-600 tracking-wide"
                htmlFor="h-story"
              >
                STORY
              </label>
              <Textarea
                id="h-story"
                rows={7}
                value={form.story}
                onChange={(e) =>
                  setForm((f) => ({ ...f, story: e.target.value }))
                }
              />
            </div>
            <div>
              <label
                className="text-xs text-neutral-600 tracking-wide"
                htmlFor="h-vision"
              >
                VISION
              </label>
              <Textarea
                id="h-vision"
                rows={7}
                value={form.vision}
                onChange={(e) =>
                  setForm((f) => ({ ...f, vision: e.target.value }))
                }
              />
            </div>
            <div>
              <label
                className="text-xs text-neutral-600 tracking-wide"
                htmlFor="h-mission"
              >
                MISSION
              </label>
              <Textarea
                id="h-mission"
                rows={7}
                value={form.mission}
                onChange={(e) =>
                  setForm((f) => ({ ...f, mission: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-6">
              <div className="text-xs text-neutral-600 tracking-wide">
                ZONE IN EVIDENZA
              </div>
              <div className="mt-3 grid gap-2">
                {(zones.data || []).map((z0) => (
                  <label
                    key={z0.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-[rgb(var(--card))] px-3 py-2"
                  >
                    <div className="text-sm text-neutral-900">{z0.name}</div>
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={form.featuredZoneIds.includes(z0.id)}
                      onChange={() =>
                        setForm((f) => ({
                          ...f,
                          featuredZoneIds: toggle(f.featuredZoneIds, z0.id),
                        }))
                      }
                      aria-label={`Seleziona ${z0.name}`}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-6">
              <div className="text-xs text-neutral-600 tracking-wide">
                AZIENDE IN EVIDENZA
              </div>
              <div className="mt-3 grid gap-2">
                {(producers.data || []).map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-[rgb(var(--card))] px-3 py-2"
                  >
                    <div className="text-sm text-neutral-900">{p.name}</div>
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={form.featuredProducerIds.includes(p.id)}
                      onChange={() =>
                        setForm((f) => ({
                          ...f,
                          featuredProducerIds: toggle(
                            f.featuredProducerIds,
                            p.id,
                          ),
                        }))
                      }
                      aria-label={`Seleziona ${p.name}`}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
