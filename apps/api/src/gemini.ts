import { GoogleGenerativeAI } from "@google/generative-ai";
import { read as xlsxRead, utils as xlsxUtils } from "xlsx";
import { z } from "zod";
import { GeminiExtractedSchema } from "./schemas.js";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const EXCEL_MIME = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

export function isExcelMime(mime: string): boolean {
  return EXCEL_MIME.has(mime);
}

export function isSupportedMime(mime: string): boolean {
  return ALLOWED_MIME.has(mime);
}

const JSON_SCHEMA = `{
  "type": "in" oppure "out",
  "invoiceNumber": "numero fattura o DDT" (null se assente),
  "invoiceDate": "data in formato YYYY-MM-DD" (null se assente),
  "supplierOrCustomer": "ragione sociale del fornitore se type=in, oppure del cliente se type=out" (null se assente),
  "lines": [
    {
      "wineName": "nome completo del vino con annata se presente (es. 'Tinc Set 2024', 'Baudili Orange 2025')",
      "wineId": "id dal catalogo vini se trovi una corrispondenza semantica, altrimenti null",
      "quantity": numero intero di bottiglie,
      "unitPriceCents": prezzo unitario NETTO in centesimi di euro dopo eventuali sconti (intero, null se assente),
      "notes": "eventuali note utili: gradazione, lotto, codice interno" (null se assente)
    }
  ]
}`;

const LINE_RULES = `REGOLE RIGHE:
- Includi SOLO le righe di vino o bevanda alcolica in bottiglia
- Escludi: KEG, fusti, imballi, trasporti, accessori, casse vuote
- Se il prezzo ha uno sconto applicato, calcola il prezzo unitario netto dopo lo sconto (prezzo × (1 - sconto%))
- La quantità è in bottiglie (non casse)
- Per il nome del vino includi l'annata se riportata nel documento`;

export interface WineForMatching {
  id: string;
  name: string;
  vintage: number | null;
  producer: string;
}

function buildCatalogSection(wines: WineForMatching[]): string {
  if (wines.length === 0) return "";
  const list = wines.map((w) => `  { "id": "${w.id}", "name": "${w.name}${w.vintage ? ` ${w.vintage}` : ""}", "producer": "${w.producer}" }`).join(",\n");
  return `\nCATALOGO VINI (usa gli id per il campo wineId — abbina per somiglianza semantica ignorando prefissi come "Vi", "ECO", nomi produttore nel titolo, ecc.):
[\n${list}\n]\n`;
}

function buildExtractionPrompt(ownerName: string, wines: WineForMatching[]): string {
  return `Analizza questa fattura o documento commerciale ed estrai i dati strutturati.${buildCatalogSection(wines)}

TITOLARE DEL SISTEMA: "${ownerName}"

COME DETERMINARE IL TIPO (dal punto di vista del titolare):
Cerca i campi MITTENTE/EMITTENTE e DESTINATARIO/CLIENTE nel documento.

- type = "in"  → il titolare è il DESTINATARIO/CLIENTE (ha ricevuto la fattura, bottiglie in entrata)
  Indicatori: il nome del titolare appare nel campo "destinatario", "cliente", "fatturare a", "spedire a", "all'attenzione di"

- type = "out" → il titolare è il MITTENTE/EMITTENTE (ha emesso la fattura, bottiglie in uscita)
  Indicatori: il nome del titolare appare nell'intestazione in alto, nel logo, nel campo "emittente" o "fornitore";
  il destinatario è un'altra azienda o privato

ATTENZIONE: il titolare può comparire con varianti (maiuscolo, minuscolo, abbreviazioni). Confronta per somiglianza, non solo uguaglianza esatta.

Restituisci SOLO un oggetto JSON valido (nessun testo aggiuntivo, nessun markdown):
${JSON_SCHEMA}

${LINE_RULES}`;
}

function buildExcelExtractionPrompt(ownerName: string, wines: WineForMatching[]): string {
  return `Analizza questa tabella CSV che rappresenta una fattura emessa DA "${ownerName}" verso un cliente.${buildCatalogSection(wines)}

Il campo "type" è sempre "out" perché questo documento è sempre una vendita del titolare.

Estrai i dati strutturati e restituisci SOLO un oggetto JSON valido (nessun testo aggiuntivo, nessun markdown):
${JSON_SCHEMA}

${LINE_RULES}`;
}

const MODEL_FALLBACK = ["gemini-2.0-flash", "gemini-2.5-flash"];

interface GenerateResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

const RETRIES_PER_MODEL = 2;
const RETRY_DELAY_MS = 2000;

async function generateWithFallback(
  apiKey: string,
  parts: Parameters<ReturnType<GoogleGenerativeAI["getGenerativeModel"]>["generateContent"]>[0],
): Promise<GenerateResult> {
  let lastErr: unknown;
  for (const modelName of MODEL_FALLBACK) {
    for (let attempt = 0; attempt < RETRIES_PER_MODEL; attempt++) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(parts);
        const usage = result.response.usageMetadata;
        return {
          text: result.response.text(),
          inputTokens: usage?.promptTokenCount ?? 0,
          outputTokens: usage?.candidatesTokenCount ?? 0,
        };
      } catch (e: any) {
        const isTransient = e?.message?.includes("503") || e?.message?.includes("overloaded") || e?.message?.includes("429") || e?.message?.includes("quota") || e?.message?.includes("rate");
        if (!isTransient) throw e;
        lastErr = e;
        if (attempt < RETRIES_PER_MODEL - 1) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      }
    }
  }
  throw lastErr;
}

export function estimateCostEur(inputTokens: number, outputTokens: number): number {
  return (inputTokens * 0.10 + outputTokens * 0.40) / 1_000_000;
}

function parseGeminiJson(raw: string): unknown {
  return JSON.parse(
    raw
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim(),
  );
}

function excelToCsv(buffer: Buffer): string {
  const wb = xlsxRead(buffer, { type: "buffer" });
  return wb.SheetNames.map((name) => {
    const csv = xlsxUtils.sheet_to_csv(wb.Sheets[name]);
    return wb.SheetNames.length > 1 ? `=== ${name} ===\n${csv}` : csv;
  }).join("\n\n");
}

export interface ExtractResult {
  data: z.infer<typeof GeminiExtractedSchema>;
  inputTokens: number;
  outputTokens: number;
}

export async function extractInvoice(
  apiKey: string,
  ownerName: string,
  fileBuffer: Buffer,
  mimeType: string,
  wines: WineForMatching[] = [],
): Promise<ExtractResult> {
  const { text, inputTokens, outputTokens } = await generateWithFallback(apiKey, [
    { inlineData: { mimeType, data: fileBuffer.toString("base64") } },
    buildExtractionPrompt(ownerName, wines),
  ]);
  return { data: GeminiExtractedSchema.parse(parseGeminiJson(text)), inputTokens, outputTokens };
}

export async function extractInvoiceFromExcel(
  apiKey: string,
  ownerName: string,
  fileBuffer: Buffer,
  wines: WineForMatching[] = [],
): Promise<ExtractResult> {
  const csv = excelToCsv(fileBuffer);
  const { text, inputTokens, outputTokens } = await generateWithFallback(
    apiKey,
    `${buildExcelExtractionPrompt(ownerName, wines)}\n\nContenuto del documento (tabella CSV):\n${csv}`,
  );
  const extracted = GeminiExtractedSchema.parse(parseGeminiJson(text));
  return { data: { ...extracted, type: "out" }, inputTokens, outputTokens };
}
