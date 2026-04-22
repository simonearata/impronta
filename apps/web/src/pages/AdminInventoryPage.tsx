import { useState } from "react";
import React from "react";
import { Link } from "react-router-dom";
import { Meta } from "../components/Meta";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { EmptyState } from "../components/EmptyState";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { Textarea } from "../components/Textarea";
import {
  adminCreateMovement,
  adminDeleteMovement,
  adminUpdateMovement,
  calculateStock,
  useAdminMovements,
  useAdminProducers,
  useAdminWines,
} from "../data/admin";
import type { InventoryMovement, InventoryMovementInput } from "../shared/types";

const typeLabel: Record<string, string> = {
  in: "Entrata",
  out: "Uscita",
  adjustment: "Rettifica",
};

const typeBadge: Record<string, string> = {
  in: "bg-green-100 text-green-800",
  out: "bg-red-100 text-red-800",
  adjustment: "bg-neutral-100 text-neutral-700",
};

function formatEur(cents: number | null) {
  if (cents == null) return "—";
  return `€ ${(cents / 100).toFixed(2)}`;
}

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="card-surface rounded-2xl p-6">
      <div className="text-xs text-neutral-600 tracking-wide">{label}</div>
      <div className="mt-2 font-mono text-3xl font-semibold text-neutral-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-neutral-500">{sub}</div>}
    </div>
  );
}

function exportCSV(movements: InventoryMovement[]) {
  const headers = ["Data", "N. Fattura/DDT", "Tipo", "Vino", "Quantità", "Prezzo unitario (€)", "Fornitore/Cliente", "Note"];
  const rows = movements.map((m) => [
    m.invoiceDate ?? "",
    m.invoiceNumber ?? "",
    typeLabel[m.type] ?? m.type,
    m.wineName,
    String(m.quantity),
    m.unitPriceCents != null ? (m.unitPriceCents / 100).toFixed(2) : "",
    m.supplierOrCustomer ?? "",
    m.notes ?? "",
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `magazzino_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type SortKey = "name" | "stock";
type SortDir = "asc" | "desc";

type ManualForm = {
  wineId: string;
  wineName: string;
  type: string;
  quantity: string;
  unitPriceEur: string;
  invoiceNumber: string;
  invoiceDate: string;
  supplierOrCustomer: string;
  notes: string;
};

const emptyManual: ManualForm = {
  wineId: "", wineName: "", type: "in", quantity: "",
  unitPriceEur: "", invoiceNumber: "", invoiceDate: "",
  supplierOrCustomer: "", notes: "",
};

type EditState = { id: string; form: ManualForm };

export function AdminInventoryPage() {
  const movements = useAdminMovements();
  const wines = useAdminWines();
  const producers = useAdminProducers();

  const [sortKey, setSortKey] = useState<SortKey>("stock");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState<ManualForm>(emptyManual);
  const [manualBusy, setManualBusy] = useState(false);
  const [manualErr, setManualErr] = useState("");

  const [editing, setEditing] = useState<EditState | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const allMovements = movements.data || [];
  const allWines = wines.data || [];
  const allProducers = producers.data || [];

  const wineIds = [...new Set(allMovements.map((m) => m.wineId).filter(Boolean) as string[])];
  const stockByWine = wineIds.map((wid) => {
    const wine = allWines.find((w) => w.id === wid);
    const producer = wine ? allProducers.find((p) => p.id === wine.producerId) : null;
    return {
      wineId: wid,
      name: wine?.name ?? allMovements.find((m) => m.wineId === wid)?.wineName ?? wid,
      producerId: producer?.id ?? null,
      producerName: producer?.name ?? null,
      stock: calculateStock(allMovements, wid),
    };
  });

  // Group by producer, sort groups alphabetically, wines within group by sortKey
  const producerGroups = (() => {
    const map = new Map<string, { producerName: string; wines: typeof stockByWine }>();
    for (const entry of stockByWine) {
      const key = entry.producerId ?? "__none__";
      if (!map.has(key)) map.set(key, { producerName: entry.producerName ?? "—", wines: [] });
      map.get(key)!.wines.push(entry);
    }
    return [...map.entries()]
      .sort(([, a], [, b]) => a.producerName.localeCompare(b.producerName, "it"))
      .map(([, group]) => ({
        ...group,
        wines: [...group.wines].sort((a, b) => {
          if (sortKey === "name") {
            const cmp = a.name.localeCompare(b.name, "it");
            return sortDir === "asc" ? cmp : -cmp;
          }
          const cmp = a.stock - b.stock;
          return sortDir === "asc" ? cmp : -cmp;
        }),
      }));
  })();

  const totalBottles = stockByWine.reduce((acc, { stock }) => acc + Math.max(stock, 0), 0);
  const alertWines = stockByWine.filter(({ stock }) => stock <= 0);
  const lowStockWines = stockByWine.filter(({ stock }) => stock > 0 && stock <= 5);

  // Top sellers: sum of "out" movements per wine
  const topSellers = (() => {
    const map = new Map<string, { name: string; qty: number }>();
    for (const m of allMovements) {
      if (m.type !== "out") continue;
      const key = m.wineId ?? `name:${m.wineName}`;
      const existing = map.get(key);
      if (existing) existing.qty += m.quantity;
      else map.set(key, { name: m.wineName, qty: m.quantity });
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);
  })();
  const maxSold = topSellers[0]?.qty ?? 1;

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "stock" ? "asc" : "asc"); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-neutral-300 ml-1">↕</span>;
    return <span className="text-[rgb(var(--accent))] ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  function setManualField<K extends keyof ManualForm>(key: K, value: ManualForm[K]) {
    setManual((f) => ({ ...f, [key]: value }));
  }

  function onManualWineSelect(wineId: string) {
    const wine = allWines.find((w) => w.id === wineId);
    setManual((f) => ({
      ...f, wineId,
      wineName: wine ? wine.name + (wine.vintage ? ` ${wine.vintage}` : "") : f.wineName,
    }));
  }

  async function onManualSave() {
    setManualErr("");
    setManualBusy(true);
    try {
      const qty = parseFloat(manual.quantity);
      if (isNaN(qty) || qty === 0) throw new Error("Quantità non valida");
      if (!manual.wineName.trim()) throw new Error("Inserisci il nome del vino");
      const priceCents = manual.unitPriceEur.trim()
        ? Math.round(parseFloat(manual.unitPriceEur.replace(",", ".")) * 100) : null;
      const input: InventoryMovementInput = {
        wineId: manual.wineId || null, wineName: manual.wineName.trim(),
        type: manual.type as InventoryMovementInput["type"], quantity: qty,
        unitPriceCents: priceCents, invoiceNumber: manual.invoiceNumber || null,
        invoiceDate: manual.invoiceDate || null, supplierOrCustomer: manual.supplierOrCustomer || null,
        invoiceFileUrl: null, notes: manual.notes || null,
      };
      await adminCreateMovement(input);
      await movements.mutate();
      setManual(emptyManual);
      setShowManual(false);
    } catch (e) {
      setManualErr(String((e as Error).message || e));
    } finally {
      setManualBusy(false);
    }
  }

  function startEdit(m: InventoryMovement) {
    setEditing({
      id: m.id,
      form: {
        wineId: m.wineId ?? "", wineName: m.wineName, type: m.type,
        quantity: String(m.quantity),
        unitPriceEur: m.unitPriceCents != null ? (m.unitPriceCents / 100).toFixed(2) : "",
        invoiceNumber: m.invoiceNumber ?? "", invoiceDate: m.invoiceDate ?? "",
        supplierOrCustomer: m.supplierOrCustomer ?? "", notes: m.notes ?? "",
      },
    });
    setErr("");
  }

  async function onSaveEdit() {
    if (!editing) return;
    setBusy(true); setErr("");
    try {
      const qty = parseFloat(editing.form.quantity);
      if (isNaN(qty) || qty === 0) throw new Error("Quantità non valida");
      const priceCents = editing.form.unitPriceEur.trim()
        ? Math.round(parseFloat(editing.form.unitPriceEur.replace(",", ".")) * 100) : null;
      const input: InventoryMovementInput = {
        wineId: editing.form.wineId || null, wineName: editing.form.wineName,
        type: editing.form.type as InventoryMovementInput["type"], quantity: qty,
        unitPriceCents: priceCents, invoiceNumber: editing.form.invoiceNumber || null,
        invoiceDate: editing.form.invoiceDate || null,
        supplierOrCustomer: editing.form.supplierOrCustomer || null,
        invoiceFileUrl: null, notes: editing.form.notes || null,
      };
      await adminUpdateMovement(editing.id, input);
      await movements.mutate();
      setEditing(null);
    } catch (e) {
      setErr(String((e as Error).message || e));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Eliminare questo movimento?")) return;
    try {
      await adminDeleteMovement(id);
      await movements.mutate();
    } catch (e) {
      alert(String((e as Error).message || e));
    }
  }

  const isLoading = movements.isLoading || wines.isLoading || producers.isLoading;

  return (
    <>
      <Meta title="Admin Magazzino" path="/admin/magazzino" />

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs text-neutral-600 tracking-wide">MAGAZZINO</div>
          <h1 className="mt-2 font-serif text-4xl tracking-tighter2">Magazzino</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          {allMovements.length > 0 && (
            <button className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5" onClick={() => exportCSV(allMovements)}>
              Esporta CSV
            </button>
          )}
          <button
            className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5"
            onClick={() => { setShowManual((v) => !v); setManualErr(""); }}
          >
            {showManual ? "Annulla" : "+ Nuovo movimento"}
          </button>
          <Link className="focus-ring rounded-full px-4 py-2 text-sm bg-black/5 text-[rgb(var(--bg))]" to="/admin/magazzino/nuova-fattura">
            Carica fattura
          </Link>
        </div>
      </div>

      {/* Form manuale */}
      {showManual && (
        <div className="mt-6 card-surface rounded-2xl p-6 grid gap-4">
          <div className="text-xs text-neutral-600 tracking-wide">NUOVO MOVIMENTO MANUALE</div>
          {manualErr && <div className="rounded-xl border border-black/10 bg-black/[0.03] p-3 text-sm text-neutral-900">{manualErr}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-neutral-600 tracking-wide">TIPO MOVIMENTO</label>
              <Select value={manual.type} onChange={(e) => setManualField("type", e.target.value)}>
                <option value="in">Entrata (acquisto da fornitore)</option>
                <option value="out">Uscita (vendita a cliente)</option>
                <option value="adjustment">Rettifica manuale</option>
              </Select>
            </div>
            <div>
              <label className="text-xs text-neutral-600 tracking-wide">ABBINA VINO DAL CATALOGO</label>
              <Select value={manual.wineId} onChange={(e) => onManualWineSelect(e.target.value)}>
                <option value="">— seleziona vino —</option>
                {allWines.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}{w.vintage ? ` ${w.vintage}` : ""}</option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-neutral-600 tracking-wide">NOME VINO</label>
              <Input value={manual.wineName} onChange={(e) => setManualField("wineName", e.target.value)} placeholder="Nome del vino" />
            </div>
            <div>
              <label className="text-xs text-neutral-600 tracking-wide">QUANTITÀ (bottiglie)</label>
              <Input value={manual.quantity} onChange={(e) => setManualField("quantity", e.target.value)} inputMode="decimal" placeholder="es. 6" />
            </div>
            <div>
              <label className="text-xs text-neutral-600 tracking-wide">PREZZO UNITARIO (€)</label>
              <Input value={manual.unitPriceEur} onChange={(e) => setManualField("unitPriceEur", e.target.value)} inputMode="decimal" placeholder="es. 18.00" />
            </div>
            <div>
              <label className="text-xs text-neutral-600 tracking-wide">N. FATTURA / DDT</label>
              <Input value={manual.invoiceNumber} onChange={(e) => setManualField("invoiceNumber", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-neutral-600 tracking-wide">DATA</label>
              <Input type="date" value={manual.invoiceDate} onChange={(e) => setManualField("invoiceDate", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-neutral-600 tracking-wide">FORNITORE / CLIENTE</label>
              <Input value={manual.supplierOrCustomer} onChange={(e) => setManualField("supplierOrCustomer", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-neutral-600 tracking-wide">NOTE</label>
              <Textarea rows={2} value={manual.notes} onChange={(e) => setManualField("notes", e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5" onClick={() => { setShowManual(false); setManual(emptyManual); setManualErr(""); }}>Annulla</button>
            <Button onClick={onManualSave} disabled={manualBusy}>{manualBusy ? "Salvataggio…" : "Salva movimento"}</Button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card-surface rounded-2xl p-6"><Skeleton className="h-4 w-1/2" /><Skeleton className="mt-3 h-8 w-1/3" /></div>
          ))
        ) : (
          <>
            <StatCard label="VINI TRACCIATI" value={stockByWine.length} sub="con almeno un movimento" />
            <StatCard label="BOTTIGLIE IN STOCK" value={totalBottles} sub="somma stock positivi" />
            <StatCard label="MOVIMENTI TOTALI" value={allMovements.length} sub="entrate · uscite · rettifiche" />
          </>
        )}
      </div>

      {/* Alert */}
      {!isLoading && (alertWines.length > 0 || lowStockWines.length > 0) && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="text-xs font-medium text-amber-700 tracking-wide mb-3">ATTENZIONE SCORTE</div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {alertWines.map(({ wineId, name, stock }) => (
              <div key={wineId} className="flex items-center justify-between gap-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5">
                <span className="text-sm text-red-900 font-medium truncate">{name}</span>
                <span className="text-sm font-mono font-semibold text-red-600 shrink-0">{stock === 0 ? "Esaurito" : stock}</span>
              </div>
            ))}
            {lowStockWines.map(({ wineId, name, stock }) => (
              <div key={wineId} className="flex items-center justify-between gap-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5">
                <span className="text-sm text-amber-900 truncate">{name}</span>
                <span className="text-sm font-mono font-semibold text-amber-600 shrink-0">{stock} bt</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Più venduti */}
      {!isLoading && topSellers.length > 0 && (
        <div className="mt-8">
          <div className="text-xs text-neutral-600 tracking-wide mb-3">PIÙ VENDUTI</div>
          <div className="card-surface rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-xs text-neutral-500 tracking-wide">
                  <th className="px-5 py-3 text-left font-medium w-8">#</th>
                  <th className="px-5 py-3 text-left font-medium">VINO</th>
                  <th className="px-5 py-3 text-right font-medium">BOTTIGLIE VENDUTE</th>
                </tr>
              </thead>
              <tbody>
                {topSellers.map(({ name, qty }, i) => {
                  const barPct = Math.round((qty / maxSold) * 100);
                  const isLast = i === topSellers.length - 1;
                  return (
                    <tr key={name + i} className={`${!isLast ? "border-b border-black/[0.06]" : ""} hover:bg-black/[0.02] transition-colors`}>
                      <td className="px-5 py-3 text-neutral-400 font-mono text-xs">{i + 1}</td>
                      <td className="px-5 py-3">
                        <div className="font-serif text-base tracking-tighter2 leading-tight">{name}</div>
                        <div className="mt-1.5 h-1.5 w-full max-w-[160px] rounded-full bg-black/[0.06]">
                          <div
                            className="h-full rounded-full bg-[rgb(var(--accent))]/60"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-semibold text-neutral-900">{qty}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabella stock per produttore */}
      {!isLoading && stockByWine.length > 0 && (
        <div className="mt-8">
          <div className="text-xs text-neutral-600 tracking-wide mb-3">STOCK PER VINO</div>
          <div className="card-surface rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-xs text-neutral-500 tracking-wide">
                  <th className="px-5 py-3 text-left font-medium">
                    <button className="hover:text-neutral-800 transition flex items-center gap-0.5" onClick={() => toggleSort("name")}>
                      VINO <SortIcon col="name" />
                    </button>
                  </th>
                  <th className="px-5 py-3 text-left font-medium hidden sm:table-cell">STATO</th>
                  <th className="px-5 py-3 text-right font-medium">
                    <button className="hover:text-neutral-800 transition flex items-center gap-0.5 ml-auto" onClick={() => toggleSort("stock")}>
                      STOCK <SortIcon col="stock" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {producerGroups.map((group) => (
                  <React.Fragment key={group.producerName}>
                    <tr>
                      <td colSpan={3} className="px-5 pt-4 pb-1 text-[11px] font-semibold text-[rgb(var(--accent))] tracking-widest uppercase border-b border-black/[0.04] bg-black/[0.015]">
                        {group.producerName}
                      </td>
                    </tr>
                    {group.wines.map(({ wineId, name, stock }, i) => {
                      const isLast = i === group.wines.length - 1;
                      const status =
                        stock <= 0 ? { label: "Esaurito", cls: "bg-red-100 text-red-700" }
                        : stock <= 5 ? { label: "Bassa scorta", cls: "bg-amber-100 text-amber-700" }
                        : { label: "OK", cls: "bg-green-100 text-green-700" };
                      return (
                        <tr key={wineId} className={`${!isLast ? "border-b border-black/[0.04]" : "border-b border-black/[0.08]"} hover:bg-black/[0.02] transition-colors`}>
                          <td className="px-5 py-3 font-serif text-base tracking-tighter2 leading-tight pl-6">{name}</td>
                          <td className="px-5 py-3 hidden sm:table-cell">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.cls}`}>{status.label}</span>
                          </td>
                          <td className={`px-5 py-3 text-right font-mono text-lg font-semibold ${stock < 0 ? "text-red-600" : stock === 0 ? "text-neutral-400" : stock <= 5 ? "text-amber-600" : "text-neutral-900"}`}>
                            {stock}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lista movimenti */}
      <div className="mt-8">
        <div className="text-xs text-neutral-600 tracking-wide mb-3">MOVIMENTI</div>
        {movements.error ? (
          <EmptyState title="Errore" description={String(movements.error.message || movements.error)} />
        ) : movements.isLoading ? (
          <div className="grid gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card-surface rounded-2xl p-5"><Skeleton className="h-5 w-1/3" /><Skeleton className="mt-3 h-4 w-1/2" /></div>
            ))}
          </div>
        ) : allMovements.length === 0 ? (
          <EmptyState title="Nessun movimento" description="Carica una fattura o aggiungi un movimento manuale per iniziare." />
        ) : (
          <div className="grid gap-3">
            {allMovements.map((m) =>
              editing?.id === m.id ? (
                <div key={m.id} className="card-surface rounded-2xl p-6 grid gap-4">
                  {err && <div className="rounded-xl border border-black/10 bg-black/[0.03] p-3 text-sm text-neutral-900">{err}</div>}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs text-neutral-600 tracking-wide">VINO</label>
                      <Select value={editing.form.wineId} onChange={(e) => { const wid = e.target.value; const w = allWines.find((x) => x.id === wid); setEditing((s) => s ? ({ ...s, form: { ...s.form, wineId: wid, wineName: w ? w.name + (w.vintage ? ` ${w.vintage}` : "") : s.form.wineName } }) : s); }}>
                        <option value="">— nessun abbinamento —</option>
                        {allWines.map((w) => <option key={w.id} value={w.id}>{w.name}{w.vintage ? ` ${w.vintage}` : ""}</option>)}
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-neutral-600 tracking-wide">NOME VINO</label>
                      <Input value={editing.form.wineName} onChange={(e) => setEditing((s) => s ? ({ ...s, form: { ...s.form, wineName: e.target.value } }) : s)} />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-600 tracking-wide">TIPO</label>
                      <Select value={editing.form.type} onChange={(e) => setEditing((s) => s ? ({ ...s, form: { ...s.form, type: e.target.value } }) : s)}>
                        <option value="in">Entrata</option>
                        <option value="out">Uscita</option>
                        <option value="adjustment">Rettifica</option>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-neutral-600 tracking-wide">QUANTITÀ</label>
                      <Input value={editing.form.quantity} onChange={(e) => setEditing((s) => s ? ({ ...s, form: { ...s.form, quantity: e.target.value } }) : s)} />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-600 tracking-wide">PREZZO UNITARIO (€)</label>
                      <Input value={editing.form.unitPriceEur} onChange={(e) => setEditing((s) => s ? ({ ...s, form: { ...s.form, unitPriceEur: e.target.value } }) : s)} />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-600 tracking-wide">N. FATTURA</label>
                      <Input value={editing.form.invoiceNumber} onChange={(e) => setEditing((s) => s ? ({ ...s, form: { ...s.form, invoiceNumber: e.target.value } }) : s)} />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-600 tracking-wide">DATA</label>
                      <Input type="date" value={editing.form.invoiceDate} onChange={(e) => setEditing((s) => s ? ({ ...s, form: { ...s.form, invoiceDate: e.target.value } }) : s)} />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-600 tracking-wide">FORNITORE / CLIENTE</label>
                      <Input value={editing.form.supplierOrCustomer} onChange={(e) => setEditing((s) => s ? ({ ...s, form: { ...s.form, supplierOrCustomer: e.target.value } }) : s)} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-600 tracking-wide">NOTE</label>
                    <Textarea rows={2} value={editing.form.notes} onChange={(e) => setEditing((s) => s ? ({ ...s, form: { ...s.form, notes: e.target.value } }) : s)} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button className="focus-ring rounded-full px-4 py-2 text-sm border border-black/10 bg-black/5" onClick={() => setEditing(null)}>Annulla</button>
                    <Button onClick={onSaveEdit} disabled={busy}>{busy ? "Salvataggio…" : "Salva"}</Button>
                  </div>
                </div>
              ) : (
                <div key={m.id} className="card-surface rounded-2xl p-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeBadge[m.type]}`}>{typeLabel[m.type]}</span>
                      <span className="font-serif text-xl tracking-tighter2">{m.wineName}</span>
                      <span className="text-neutral-500 text-sm">× {m.quantity}</span>
                    </div>
                    <div className="mt-1 text-xs text-neutral-500 flex flex-wrap gap-x-3 gap-y-0.5">
                      {m.invoiceDate && <span>{m.invoiceDate}</span>}
                      {m.invoiceNumber && <span>{m.invoiceNumber}</span>}
                      {m.supplierOrCustomer && <span>{m.supplierOrCustomer}</span>}
                      {m.unitPriceCents != null && <span>{formatEur(m.unitPriceCents)} / bt</span>}
                      {m.notes && <span className="text-neutral-400 italic">{m.notes}</span>}
                    </div>
                    {m.invoiceFileUrl && (
                      <a href={m.invoiceFileUrl} target="_blank" rel="noreferrer" className="mt-1 text-xs text-neutral-500 underline">Apri fattura</a>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button className="focus-ring rounded-full px-3 py-1.5 text-sm border border-black/10 bg-black/5" onClick={() => startEdit(m)}>Modifica</button>
                    <button className="focus-ring rounded-full px-3 py-1.5 text-sm border border-red-200 bg-red-50 text-red-700" onClick={() => onDelete(m.id)}>Elimina</button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </>
  );
}
