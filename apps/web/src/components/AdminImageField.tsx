import { useMemo, useRef, useState } from "react";
import { cn } from "../shared/utils";

type Props = {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
};

export function AdminImageField({ label, value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const preview = useMemo(() => {
    if (!value) return null;
    return value;
  }, [value]);

  async function onPick(file: File) {
    setBusy(true);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(new Error("Errore lettura file"));
      fr.readAsDataURL(file);
    });
    onChange(dataUrl);
    setBusy(false);
  }

  return (
    <div className="grid gap-3">
      <div className="text-xs text-neutral-600 tracking-wide">{label}</div>

      <div className="grid gap-4 sm:grid-cols-[160px_1fr] items-start">
        <div
          className={cn(
            "card-surface rounded-2xl overflow-hidden border border-black/10",
            preview ? "" : "bg-gradient-to-b from-black/10 to-black/0"
          )}
          style={{ width: 160, height: 120 }}
        >
          {preview ? (
            <img src={preview} alt="" className="w-full h-full object-cover" />
          ) : null}
        </div>

        <div className="grid gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              aria-label="Carica immagine"
            >
              {busy ? "Caricamento…" : "Carica"}
            </button>

            <button
              type="button"
              className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5"
              onClick={() => onChange(null)}
              disabled={!value}
              aria-label="Rimuovi immagine"
            >
              Rimuovi
            </button>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              onPick(f).catch(() => setBusy(false));
              e.currentTarget.value = "";
            }}
          />

          <div className="text-xs text-neutral-600">
            In mock salviamo una data-URL in localStorage. In prod useremo
            upload su API + storage.
          </div>
        </div>
      </div>
    </div>
  );
}
