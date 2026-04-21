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
  adminUpsertProducer,
  adminUpsertWine,
  adminUpsertZone,
  calculateStock,
  useAdminMovements,
  useAdminProducers,
  useAdminWines,
  useAdminZones,
  type ExtractedInvoice,
} from "../data/admin";
import type { InventoryMovementInput, WineType } from "../shared/types";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/['']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

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
): { id: string; score: number } {
  const invoiceWords = normalizeWords(wineName);
  if (invoiceWords.length === 0) return { id: "", score: 0 };
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
  return bestScore >= 0.4 ? { id: bestId, score: bestScore } : { id: "", score: 0 };
}

function matchProducerId(
  supplierName: string,
  producers: { id: string; name: string }[],
): string {
  const words = normalizeWords(supplierName);
  if (words.length === 0) return "";
  let bestId = "";
  let bestScore = 0;
  for (const p of producers) {
    const pWords = normalizeWords(p.name);
    if (pWords.length === 0) continue;
    const common = words.filter((w) => pWords.some((pw) => pw.includes(w) || w.includes(pw)));
    const score = common.length / Math.max(words.length, pWords.length);
    if (score > bestScore) { bestScore = score; bestId = p.id; }
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
  matchScore: number; // 0 = nessun auto-match o selezione manuale
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
    lines: extracted.lines.map((l) => {
      const match = matchWineId(l.wineName, wines);
      return {
        included: true,
        wineName: l.wineName,
        wineId: match.id,
        matchScore: match.score,
        quantity: String(l.quantity),
        unitPriceEur: l.unitPriceCents != null ? (l.unitPriceCents / 100).toFixed(2) : "",
        notes: l.notes ?? "",
      };
    }),
  };
}

type QuickCreate = {
  invIdx: number;
  lineIdx: number;
  // wine
  name: string;
  producerId: string; // "" = nessuno, "__new__" = crea nuovo
  type: WineType;
  vintage: string;
  // nuovo produttore (se producerId === "__new__")
  newProducerName: string;
  newProducerZoneId: string; // "" = nessuno, "__new__" = crea nuova zona
  // nuova zona (se newProducerZoneId === "__new__")
  newZoneName: string;
  newZoneCountry: string;
  newZoneRegion: string;
  busy: boolean;
  err: string;
};

type Step = "upload" | "loading" | "review" | "done";

/* ── component ─────────────────────────────────────────── */

export function AdminInvoiceUploadPage() {
  const nav = useNavigate();
  const wines = useAdminWines();
  const producers = useAdminProducers();
  const zones = useAdminZones();
  const movements = useAdminMovements();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [quickCreate, setQuickCreate] = useState<QuickCreate | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [extractErr, setExtractErr] = useState("");
  const [saveErr, setSaveErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [negativeAlert, setNegativeAlert] = useState<string[]>([]);

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
                  ? { ...l, wineId, matchScore: 0, wineName: wine ? wine.name + (wine.vintage ? ` ${wine.vintage}` : "") : l.wineName }
                  : l,
              ),
            }
          : inv,
      ),
    );
  }

  const totalIncluded = invoices.reduce((acc, inv) => acc + inv.lines.filter((l) => l.included).length, 0);

  async function onConfirm(force = false) {
    setSaveErr("");
    setNegativeAlert([]);

    // Controllo giacenze negative per movimenti in uscita
    if (!force) {
      const allMovements = movements.data || [];
      const negatives: string[] = [];
      for (const inv of invoices) {
        if (inv.header.type !== "out") continue;
        for (const line of inv.lines.filter((l) => l.included && l.wineId)) {
          const qty = parseFloat(line.quantity);
          if (isNaN(qty)) continue;
          const current = calculateStock(allMovements, line.wineId);
          if (current - qty < 0) {
            const wine = (wines.data || []).find((w) => w.id === line.wineId);
            negatives.push(`${wine?.name ?? line.wineName} (giacenza: ${current}, uscita: ${qty})`);
          }
        }
      }
      if (negatives.length > 0) {
        setNegativeAlert(negatives);
        return;
      }
    }

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
    setQuickCreate(null);
    setNegativeAlert([]);
  }

  function openQuickCreate(invIdx: number, lineIdx: number, wineName: string, supplierName: string) {
    const autoProducerId = matchProducerId(supplierName, producers.data || []);
    setQuickCreate({
      invIdx, lineIdx,
      name: wineName,
      producerId: autoProducerId,
      type: "white",
      vintage: "",
      newProducerName: supplierName,
      newProducerZoneId: "",
      newZoneName: "",
      newZoneCountry: "",
      newZoneRegion: "",
      busy: false,
      err: "",
    });
  }

  async function submitQuickCreate() {
    if (!quickCreate) return;
    const q = quickCreate;

    if (!q.name.trim()) {
      setQuickCreate((s) => s && ({ ...s, err: "Il nome del vino è obbligatorio." }));
      return;
    }
    if (!q.producerId) {
      setQuickCreate((s) => s && ({ ...s, err: "Scegli o crea un'azienda." }));
      return;
    }
    if (q.producerId === "__new__") {
      if (!q.newProducerName.trim()) {
        setQuickCreate((s) => s && ({ ...s, err: "Il nome dell'azienda è obbligatorio." }));
        return;
      }
      if (!q.newProducerZoneId) {
        setQuickCreate((s) => s && ({ ...s, err: "Scegli o crea una zona per l'azienda." }));
        return;
      }
      if (q.newProducerZoneId === "__new__" && (!q.newZoneName.trim() || !q.newZoneCountry.trim() || !q.newZoneRegion.trim())) {
        setQuickCreate((s) => s && ({ ...s, err: "Compila nome, paese e regione per la nuova zona." }));
        return;
      }
    }

    setQuickCreate((s) => s && ({ ...s, busy: true, err: "" }));
    try {
      let resolvedProducerId = q.producerId;
      let producerSlug = (producers.data || []).find((p) => p.id === q.producerId)?.slug ?? "";

      if (q.producerId === "__new__") {
        // 1. Crea zona se necessario
        let resolvedZoneId = q.newProducerZoneId;
        if (q.newProducerZoneId === "__new__") {
          const newZone = await adminUpsertZone({
            id: crypto.randomUUID(),
            name: q.newZoneName.trim(),
            slug: slugify(q.newZoneName),
            country: q.newZoneCountry.trim(),
            region: q.newZoneRegion.trim(),
            descriptionShort: "",
            descriptionLong: "",
            coverImageUrl: null,
          });
          resolvedZoneId = newZone.id;
        }
        // 2. Crea produttore
        producerSlug = slugify(q.newProducerName);
        const newProducer = await adminUpsertProducer({
          id: crypto.randomUUID(),
          zoneId: resolvedZoneId,
          name: q.newProducerName.trim(),
          slug: producerSlug,
          philosophyShort: "",
          storyLong: "",
          location: null,
          website: null,
          instagram: null,
          coverImageUrl: null,
        });
        resolvedProducerId = newProducer.id;
      }

      // 3. Crea vino
      const wine = await adminUpsertWine({
        id: crypto.randomUUID(),
        producerId: resolvedProducerId,
        name: q.name.trim(),
        slug: slugify(`${producerSlug}-${q.name}${q.vintage ? `-${q.vintage}` : ""}`),
        vintage: q.vintage ? parseInt(q.vintage, 10) : null,
        type: q.type,
        grapes: null, alcohol: null, vinification: null,
        tastingNotes: null, pairing: null,
        priceCents: null, isAvailable: true, bottleSizeMl: 750, imageUrl: null,
      });

      onLineWineSelect(q.invIdx, q.lineIdx, wine.id);
      setQuickCreate(null);
    } catch (e) {
      setQuickCreate((s) => s && ({ ...s, busy: false, err: String((e as Error).message || e) }));
    }
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

            {/* Alert giacenza negativa */}
            {negativeAlert.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <div className="font-medium mb-2">Attenzione: giacenza insufficiente per {negativeAlert.length} vino{negativeAlert.length > 1 ? "i" : ""}</div>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  {negativeAlert.map((msg, i) => <li key={i}>{msg}</li>)}
                </ul>
                <div className="mt-3 flex gap-2">
                  <button
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-300 bg-white hover:bg-red-50 transition"
                    onClick={() => setNegativeAlert([])}
                  >
                    Torna alla review
                  </button>
                  <button
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
                    onClick={() => onConfirm(true)}
                  >
                    Salva comunque
                  </button>
                </div>
              </div>
            )}

            {invoices.map((inv, invIdx) => {
              const invIncluded = inv.lines.filter((l) => l.included).length;
              const existingMovements = movements.data || [];
              const isDuplicate = !!inv.header.invoiceNumber.trim() &&
                existingMovements.some((m) =>
                  m.invoiceNumber?.trim().toLowerCase() === inv.header.invoiceNumber.trim().toLowerCase() &&
                  m.supplierOrCustomer?.trim().toLowerCase() === inv.header.supplierOrCustomer.trim().toLowerCase()
                );
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
                    <div className="flex items-center gap-2 shrink-0">
                      {isDuplicate && (
                        <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                          già caricata
                        </span>
                      )}
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-black/[0.05] text-neutral-600">
                        {invIncluded} / {inv.lines.length} righe
                      </span>
                    </div>
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
                                {line.matchScore > 0 && (
                                  <div className={`mb-1 flex items-center gap-1.5 text-xs ${line.matchScore >= 0.7 ? "text-emerald-600" : "text-amber-600"}`}>
                                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${line.matchScore >= 0.7 ? "bg-emerald-500" : "bg-amber-400"}`} />
                                    {line.matchScore >= 0.7 ? "abbinamento sicuro" : "abbinamento incerto — verifica"}
                                    <span className="text-neutral-400">({Math.round(line.matchScore * 100)}%)</span>
                                  </div>
                                )}
                                <div className="flex gap-2 items-start">
                                  <Select
                                    value={line.wineId}
                                    onChange={(e) => {
                                      onLineWineSelect(invIdx, lineIdx, e.target.value);
                                      if (quickCreate?.invIdx === invIdx && quickCreate?.lineIdx === lineIdx) {
                                        setQuickCreate(null);
                                      }
                                    }}
                                    disabled={!line.included}
                                  >
                                    <option value="">— nessun abbinamento —</option>
                                    {(wines.data || []).map((w) => (
                                      <option key={w.id} value={w.id}>
                                        {w.name}{w.vintage ? ` ${w.vintage}` : ""}
                                      </option>
                                    ))}
                                  </Select>
                                  {line.included && !line.wineId && !(quickCreate?.invIdx === invIdx && quickCreate?.lineIdx === lineIdx) && (
                                    <button
                                      type="button"
                                      className="shrink-0 mt-px rounded-lg border border-black/10 bg-black/[0.03] px-2.5 py-1.5 text-xs hover:bg-black/[0.06] transition"
                                      onClick={() => openQuickCreate(invIdx, lineIdx, line.wineName, inv.header.supplierOrCustomer)}
                                    >
                                      + Crea
                                    </button>
                                  )}
                                </div>
                                {/* Mini-form inline per creare vino / produttore / zona */}
                                {quickCreate?.invIdx === invIdx && quickCreate?.lineIdx === lineIdx && (
                                  <div className="mt-2 rounded-xl border border-black/10 bg-black/[0.03] p-3 grid gap-3">
                                    <div className="text-xs font-medium text-neutral-700 tracking-wide">NUOVO VINO</div>

                                    {/* Nome vino */}
                                    <div>
                                      <label className="text-xs text-neutral-500">NOME</label>
                                      <Input
                                        value={quickCreate.name}
                                        onChange={(e) => setQuickCreate((q) => q && ({ ...q, name: e.target.value }))}
                                      />
                                    </div>

                                    {/* Tipo + Annata */}
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-xs text-neutral-500">TIPO</label>
                                        <Select
                                          value={quickCreate.type}
                                          onChange={(e) => setQuickCreate((q) => q && ({ ...q, type: e.target.value as WineType }))}
                                        >
                                          <option value="white">Bianco</option>
                                          <option value="red">Rosso</option>
                                          <option value="rose">Rosato</option>
                                          <option value="orange">Orange</option>
                                          <option value="sparkling">Frizzante</option>
                                          <option value="other">Altro</option>
                                        </Select>
                                      </div>
                                      <div>
                                        <label className="text-xs text-neutral-500">ANNATA</label>
                                        <Input
                                          placeholder="es. 2023"
                                          value={quickCreate.vintage}
                                          onChange={(e) => setQuickCreate((q) => q && ({ ...q, vintage: e.target.value }))}
                                          inputMode="numeric"
                                        />
                                      </div>
                                    </div>

                                    {/* Azienda */}
                                    <div>
                                      <label className="text-xs text-neutral-500">AZIENDA</label>
                                      <Select
                                        value={quickCreate.producerId}
                                        onChange={(e) => setQuickCreate((q) => q && ({ ...q, producerId: e.target.value }))}
                                      >
                                        <option value="">— scegli —</option>
                                        {(producers.data || []).map((p) => (
                                          <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                        <option value="__new__">＋ Crea nuova azienda…</option>
                                      </Select>
                                    </div>

                                    {/* Nuovo produttore */}
                                    {quickCreate.producerId === "__new__" && (
                                      <div className="rounded-lg border border-black/10 bg-white/60 p-3 grid gap-2">
                                        <div className="text-xs font-medium text-neutral-600 tracking-wide">NUOVA AZIENDA</div>
                                        <div>
                                          <label className="text-xs text-neutral-500">NOME</label>
                                          <Input
                                            value={quickCreate.newProducerName}
                                            onChange={(e) => setQuickCreate((q) => q && ({ ...q, newProducerName: e.target.value }))}
                                          />
                                        </div>
                                        <div>
                                          <label className="text-xs text-neutral-500">ZONA</label>
                                          <Select
                                            value={quickCreate.newProducerZoneId}
                                            onChange={(e) => setQuickCreate((q) => q && ({ ...q, newProducerZoneId: e.target.value }))}
                                          >
                                            <option value="">— scegli zona —</option>
                                            {(zones.data || []).map((z) => (
                                              <option key={z.id} value={z.id}>
                                                {z.name} — {z.country}
                                              </option>
                                            ))}
                                            <option value="__new__">＋ Crea nuova zona…</option>
                                          </Select>
                                        </div>

                                        {/* Nuova zona */}
                                        {quickCreate.newProducerZoneId === "__new__" && (
                                          <div className="rounded-lg border border-black/10 bg-white/80 p-2 grid gap-2">
                                            <div className="text-xs font-medium text-neutral-600 tracking-wide">NUOVA ZONA</div>
                                            <div>
                                              <label className="text-xs text-neutral-500">NOME</label>
                                              <Input
                                                placeholder="es. Penedès"
                                                value={quickCreate.newZoneName}
                                                onChange={(e) => setQuickCreate((q) => q && ({ ...q, newZoneName: e.target.value }))}
                                              />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                              <div>
                                                <label className="text-xs text-neutral-500">PAESE</label>
                                                <Input
                                                  placeholder="es. Spagna"
                                                  value={quickCreate.newZoneCountry}
                                                  onChange={(e) => setQuickCreate((q) => q && ({ ...q, newZoneCountry: e.target.value }))}
                                                />
                                              </div>
                                              <div>
                                                <label className="text-xs text-neutral-500">REGIONE</label>
                                                <Input
                                                  placeholder="es. Catalunya"
                                                  value={quickCreate.newZoneRegion}
                                                  onChange={(e) => setQuickCreate((q) => q && ({ ...q, newZoneRegion: e.target.value }))}
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {quickCreate.err && (
                                      <div className="text-xs text-red-600">{quickCreate.err}</div>
                                    )}
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        type="button"
                                        className="text-xs text-neutral-500 px-2 py-1 rounded hover:bg-black/[0.05]"
                                        onClick={() => setQuickCreate(null)}
                                      >
                                        Annulla
                                      </button>
                                      <Button onClick={submitQuickCreate} disabled={quickCreate.busy}>
                                        {quickCreate.busy ? "Salvataggio…" : "Crea"}
                                      </Button>
                                    </div>
                                  </div>
                                )}
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
              <Button onClick={() => onConfirm(false)} disabled={busy || totalIncluded === 0}>
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
