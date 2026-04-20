import { useRef, useState } from "react";
import JSZip from "jszip";
import { useNavigate } from "react-router-dom";
import { Meta } from "../components/Meta";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import {
  adminCreateMovement,
  adminExtractInvoice,
  useAdminWines,
  type ExtractedInvoice,
} from "../data/admin";
import type { InventoryMovementInput } from "../shared/types";

/* ── name matching ─────────────────────────────────────── */

const STOP_WORDS = new Set(["vi", "el", "els", "la", "les", "de", "del", "dels", "eco", "the", "le", "du", "des", "vino", "wine"]);

function normalizeWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[()\/\-_,\.]/g, " ")
    .replace(/\b\d{4}\b/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function matchWineId(
  wineName: string,
  wines: { id: string; name: string; vintage: number | null }[],
): string {
  const invoiceWords = normalizeWords(wineName);
  if (invoiceWords.length === 0) return "";
  let bestId = "";
  let bestScore = 0;
  for (const w of wines) {
    const catalogWords = normalizeWords(w.name);
    if (catalogWords.length === 0) continue;
    const common = invoiceWords.filter((iw) =>
      catalogWords.some((cw) => cw.includes(iw) || iw.includes(cw)),
    );
    const score = common.length / Math.max(invoiceWords.length, catalogWords.length);
    if (score > bestScore) { bestScore = score; bestId = w.id; }
  }
  return bestScore >= 0.4 ? bestId : "";
}

/* ── ZIP extraction ─────────────────────────────────────── */

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg",
  png: "image/png", webp: "image/webp", pdf: "application/pdf",
};
const ALLOWED_MIME = new Set(Object.values(MIME_BY_EXT));

async function extractZipFiles(zipFile: File): Promise<File[]> {
  const zip = await JSZip.loadAsync(zipFile);
  const files: File[] = [];
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    const mime = MIME_BY_EXT[ext];
    if (!mime) continue;
    const blob = await entry.async("blob");
    files.push(new File([blob], path.split("/").pop() ?? path, { type: mime }));
  }
  return files;
}

/* ── types ─────────────────────────────────────────────── */

type ReviewLine = {
  included: boolean;
  wineName: string;
  wineId: string;
  quantity: string;
  unitPriceEur: string;
  notes: string;
};

type ReviewHeader = {
  type: string;
  invoiceNumber: string;
  invoiceDate: string;
  supplierOrCustomer: string;
  invoiceFileUrl: string;
};

type ReviewInvoice = {
  fileName: string;
  header: ReviewHeader;
  lines: ReviewLine[];
};

function buildReview(
  extracted: ExtractedInvoice,
  wines: { id: string; name: string; vintage: number | null }[],
): ReviewInvoice["header"] & { lines: ReviewLine[] } {
  return {
    type: extracted.type,
    invoiceNumber: extracted.invoiceNumber ?? "",
    invoiceDate: extracted.invoiceDate ?? "",
    supplierOrCustomer: extracted.supplierOrCustomer ?? "",
    invoiceFileUrl: extracted.invoiceFileUrl ?? "",
    lines: extracted.lines.map((l) => ({
      included: true,
      wineName: l.wineName,
      wineId: matchWineId(l.wineName, wines),
      quantity: String(l.quantity),
      unitPriceEur: l.unitPriceCents != null ? (l.unitPriceCents / 100).toFixed(2) : "",
      notes: l.notes ?? "",
    })),
  };
}

type Step = "upload" | "loading" | "review" | "done";

/* ── component ─────────────────────────────────────────── */

export function AdminInvoiceUploadPage() {
  const nav = useNavigate();
  const wines = useAdminWines();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [extractErr, setExtractErr] = useState("");
  const [saveErr, setSaveErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [progress, setProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  const [invoices, setInvoices] = useState<ReviewInvoice[]>([]);
  const [failedFiles, setFailedFiles] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  async function processFiles(rawFiles: File[]) {
    // Flatten ZIPs
    const expanded: File[] = [];
    for (const f of rawFiles) {
      const isZip =
        f.type === "application/zip" ||
        f.type === "application/x-zip-compressed" ||
        f.name.toLowerCase().endsWith(".zip");
      if (isZip) {
        try {
          const extracted = await extractZipFiles(f);
          expanded.push(...extracted);
        } catch {
          setExtractErr(`Impossibile aprire il file ZIP: ${f.name}`);
          return;
        }
      } else {
        expanded.push(f);
      }
    }

    const supported = expanded.filter((f) => ALLOWED_MIME.has(f.type));
    if (supported.length === 0) {
      setExtractErr("Nessun file supportato trovato. Usa JPEG, PNG, WebP, PDF o ZIP.");
      return;
    }

    setExtractErr("");
    setStep("loading");

    const results: ReviewInvoice[] = [];
    const failed: string[] = [];

    for (let i = 0; i < supported.length; i++) {
      const file = supported[i];
      setProgress({ current: i + 1, total: supported.length, fileName: file.name });
      try {
        const extracted = await adminExtractInvoice(file);
        const { lines, ...header } = buildReview(extracted, wines.data || []);
        results.push({ fileName: file.name, header, lines });
      } catch {
        failed.push(file.name);
      }
    }

    setProgress(null);

    if (results.length === 0) {
      setExtractErr("Estrazione fallita per tutti i file.");
      setStep("upload");
      return;
    }

    setInvoices(results);
    setFailedFiles(failed);
    setStep("review");
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length) processFiles(files);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) processFiles(files);
  }

  function setInvoiceHeader(invIdx: number, updates: Partial<ReviewHeader>) {
    setInvoices((ivs) =>
      ivs.map((inv, i) => i === invIdx ? { ...inv, header: { ...inv.header, ...updates } } : inv),
    );
  }

  function setLineField<K extends keyof ReviewLine>(
    invIdx: number, lineIdx: number, key: K, value: ReviewLine[K],
  ) {
    setInvoices((ivs) =>
      ivs.map((inv, i) =>
        i === invIdx
          ? { ...inv, lines: inv.lines.map((l, j) => j === lineIdx ? { ...l, [key]: value } : l) }
          : inv,
      ),
    );
  }

  function onLineWineSelect(invIdx: number, lineIdx: number, wineId: string) {
    const wine = (wines.data || []).find((w) => w.id === wineId);
    setInvoices((ivs) =>
      ivs.map((inv, i) =>
        i === invIdx
          ? {
              ...inv,
              lines: inv.lines.map((l, j) =>
                j === lineIdx
                  ? { ...l, wineId, wineName: wine ? wine.name + (wine.vintage ? ` ${wine.vintage}` : "") : l.wineName }
                  : l,
              ),
            }
          : inv,
      ),
    );
  }

  const totalIncluded = invoices.reduce((acc, inv) => acc + inv.lines.filter((l) => l.included).length, 0);

  async function onConfirm() {
    setSaveErr("");
    setBusy(true);
    let count = 0;
    try {
      for (const inv of invoices) {
        for (const line of inv.lines.filter((l) => l.included)) {
          const qty = parseFloat(line.quantity);
          if (isNaN(qty) || qty === 0) throw new Error(`Quantità non valida: "${line.wineName}"`);
          const priceCents = line.unitPriceEur.trim()
            ? Math.round(parseFloat(line.unitPriceEur.replace(",", ".")) * 100)
            : null;
          const input: InventoryMovementInput = {
            wineId: line.wineId || null,
            wineName: line.wineName,
            type: inv.header.type as InventoryMovementInput["type"],
            quantity: qty,
            unitPriceCents: priceCents,
            invoiceNumber: inv.header.invoiceNumber || null,
            invoiceDate: inv.header.invoiceDate || null,
            supplierOrCustomer: inv.header.supplierOrCustomer || null,
            invoiceFileUrl: inv.header.invoiceFileUrl || null,
            notes: line.notes || null,
          };
          await adminCreateMovement(input);
          count++;
        }
      }
      setSavedCount(count);
      setStep("done");
    } catch (e) {
      setSaveErr(String((e as Error).message || e));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setStep("upload");
    setInvoices([]);
    setFailedFiles([]);
    setSaveErr("");
    setExtractErr("");
    setProgress(null);
  }

  return (
    <>
      <Meta title="Admin Carica fattura" path="/admin/magazzino/nuova-fattura" />

      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="text-xs text-neutral-600 tracking-wide">MAGAZZINO</div>
          <h1 className="mt-2 font-serif text-4xl tracking-tighter2">Carica fattura</h1>
        </div>
      </div>

      <div className="mt-8 max-w-3xl">

        {/* STEP: upload */}
        {step === "upload" && (
          <div className="card-surface rounded-2xl p-8">
            <p className="text-sm text-neutral-700 leading-relaxed">
              Carica una o più fatture / DDT (JPEG, PNG, WebP, PDF) oppure uno ZIP con tutti i documenti.
              Gemini 2.5 Flash estrarrà le righe — potrai rivedere e correggere prima di salvare.
            </p>

            {extractErr && (
              <div className="mt-4 rounded-xl border border-black/10 bg-black/[0.03] p-3 text-sm text-neutral-900">
                {extractErr}
              </div>
            )}

            <div
              className={`mt-6 border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer transition ${
                dragOver ? "border-neutral-400 bg-black/[0.03]" : "border-black/15 hover:border-neutral-400"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <div className="text-3xl select-none">📄</div>
              <div className="text-sm text-neutral-700 text-center">
                Trascina qui i file oppure <span className="underline">clicca per selezionare</span>
              </div>
              <div className="text-xs text-neutral-500 text-center">
                JPEG · PNG · WebP · PDF · ZIP — max 20 MB per file<br />
                Selezione multipla supportata
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf,.zip"
                className="hidden"
                onChange={onFileChange}
              />
            </div>
          </div>
        )}

        {/* STEP: loading */}
        {step === "loading" && (
          <div className="card-surface rounded-2xl p-12 flex flex-col items-center gap-5">
            <div className="text-2xl animate-pulse select-none">✦</div>
            {progress ? (
              <>
                <div className="text-center">
                  <div className="text-sm text-neutral-700">Gemini sta analizzando i documenti…</div>
                  <div className="mt-1 text-xs text-neutral-500">
                    File {progress.current} di {progress.total}
                    {" — "}<span className="font-mono">{progress.fileName}</span>
                  </div>
                </div>
                <div className="w-full max-w-xs bg-black/[0.06] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-[rgb(var(--accent))] rounded-full transition-all duration-300"
                    style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="text-sm text-neutral-700">Elaborazione in corso…</div>
            )}
          </div>
        )}

        {/* STEP: review */}
        {step === "review" && (
          <div className="grid gap-6">
            {failedFiles.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <span className="font-medium">File non elaborati ({failedFiles.length}):</span>{" "}
                {failedFiles.join(", ")}
              </div>
            )}

            {saveErr && (
              <div className="rounded-xl border border-black/10 bg-black/[0.03] p-3 text-sm text-neutral-900">
                {saveErr}
              </div>
            )}

            {invoices.map((inv, invIdx) => {
              const invIncluded = inv.lines.filter((l) => l.included).length;
              return (
                <div key={invIdx} className="card-surface rounded-2xl p-6 grid gap-5">
                  {/* Invoice label */}
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-neutral-500 tracking-wide">
                        FATTURA {invIdx + 1} / {invoices.length}
                      </div>
                      <div className="mt-0.5 font-mono text-xs text-neutral-400 truncate max-w-xs">
                        {inv.fileName}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium bg-black/[0.05] text-neutral-600">
                      {invIncluded} / {inv.lines.length} righe
                    </span>
                  </div>

                  {/* Header fields */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs text-neutral-600 tracking-wide">TIPO MOVIMENTO</label>
                      <Select
                        value={inv.header.type}
                        onChange={(e) => setInvoiceHeader(invIdx, { type: e.target.value })}
                      >
                        <option value="in">Entrata (acquisto da fornitore)</option>
                        <option value="out">Uscita (vendita a cliente)</option>
                        <option value="adjustment">Rettifica manuale</option>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-neutral-600 tracking-wide">FORNITORE / CLIENTE</label>
                      <Input
                        value={inv.header.supplierOrCustomer}
                        onChange={(e) => setInvoiceHeader(invIdx, { supplierOrCustomer: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-600 tracking-wide">N. FATTURA / DDT</label>
                      <Input
                        value={inv.header.invoiceNumber}
                        onChange={(e) => setInvoiceHeader(invIdx, { invoiceNumber: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-600 tracking-wide">DATA</label>
                      <Input
                        type="date"
                        value={inv.header.invoiceDate}
                        onChange={(e) => setInvoiceHeader(invIdx, { invoiceDate: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Lines */}
                  <div>
                    <div className="text-xs text-neutral-600 tracking-wide mb-2">
                      RIGHE ESTRATTE — {invIncluded} di {inv.lines.length} selezionate
                    </div>
                    <div className="grid gap-2">
                      {inv.lines.map((line, lineIdx) => (
                        <div
                          key={lineIdx}
                          className={`rounded-xl border p-4 transition ${
                            line.included ? "border-black/10 bg-black/[0.02]" : "border-black/5 opacity-40"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 shrink-0 cursor-pointer"
                              checked={line.included}
                              onChange={(e) => setLineField(invIdx, lineIdx, "included", e.target.checked)}
                            />
                            <div className="flex-1 grid gap-3 sm:grid-cols-2">
                              <div className="sm:col-span-2">
                                <label className="text-xs text-neutral-600 tracking-wide">NOME (dalla fattura)</label>
                                <Input
                                  value={line.wineName}
                                  onChange={(e) => setLineField(invIdx, lineIdx, "wineName", e.target.value)}
                                  disabled={!line.included}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-neutral-600 tracking-wide">ABBINA AL CATALOGO</label>
                                <Select
                                  value={line.wineId}
                                  onChange={(e) => onLineWineSelect(invIdx, lineIdx, e.target.value)}
                                  disabled={!line.included}
                                >
                                  <option value="">— nessun abbinamento —</option>
                                  {(wines.data || []).map((w) => (
                                    <option key={w.id} value={w.id}>
                                      {w.name}{w.vintage ? ` ${w.vintage}` : ""}
                                    </option>
                                  ))}
                                </Select>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-neutral-600 tracking-wide">QUANTITÀ</label>
                                  <Input
                                    value={line.quantity}
                                    onChange={(e) => setLineField(invIdx, lineIdx, "quantity", e.target.value)}
                                    inputMode="decimal"
                                    disabled={!line.included}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-neutral-600 tracking-wide">PREZZO (€)</label>
                                  <Input
                                    value={line.unitPriceEur}
                                    onChange={(e) => setLineField(invIdx, lineIdx, "unitPriceEur", e.target.value)}
                                    inputMode="decimal"
                                    disabled={!line.included}
                                  />
                                </div>
                              </div>
                              {line.notes && (
                                <div className="sm:col-span-2">
                                  <label className="text-xs text-neutral-600 tracking-wide">NOTE</label>
                                  <Input
                                    value={line.notes}
                                    onChange={(e) => setLineField(invIdx, lineIdx, "notes", e.target.value)}
                                    disabled={!line.included}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between gap-4">
              <button
                className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5"
                onClick={reset}
              >
                ← Ricarica
              </button>
              <Button onClick={onConfirm} disabled={busy || totalIncluded === 0}>
                {busy
                  ? "Salvataggio…"
                  : `Conferma e salva (${totalIncluded} moviment${totalIncluded === 1 ? "o" : "i"})`}
              </Button>
            </div>
          </div>
        )}

        {/* STEP: done */}
        {step === "done" && (
          <div className="card-surface rounded-2xl p-10 flex flex-col items-center gap-6 text-center">
            <div className="text-3xl select-none">✓</div>
            <div>
              <div className="font-serif text-2xl tracking-tighter2">Movimenti salvati</div>
              <p className="mt-2 text-sm text-neutral-600">
                {savedCount} movimento{savedCount !== 1 ? "i" : ""} aggiunto{savedCount !== 1 ? "i" : ""} al magazzino.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5"
                onClick={reset}
              >
                Carica altri
              </button>
              <Button onClick={() => nav("/admin/magazzino")}>Vai al magazzino</Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
