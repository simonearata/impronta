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

function buildExtractionPrompt(ownerName: string): string {
  return `Analizza questa fattura o documento commerciale ed estrai i dati strutturati.

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

function buildExcelExtractionPrompt(ownerName: string): string {
  return `Analizza questa tabella CSV che rappresenta una fattura emessa DA "${ownerName}" verso un cliente.

Il campo "type" è sempre "out" perché questo documento è sempre una vendita del titolare.

Estrai i dati strutturati e restituisci SOLO un oggetto JSON valido (nessun testo aggiuntivo, nessun markdown):
${JSON_SCHEMA}

${LINE_RULES}`;
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

export async function extractInvoice(
  apiKey: string,
  ownerName: string,
  fileBuffer: Buffer,
  mimeType: string,
): Promise<z.infer<typeof GeminiExtractedSchema>> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent([
    { inlineData: { mimeType, data: fileBuffer.toString("base64") } },
    buildExtractionPrompt(ownerName),
  ]);

  return GeminiExtractedSchema.parse(parseGeminiJson(result.response.text()));
}

export async function extractInvoiceFromExcel(
  apiKey: string,
  ownerName: string,
  fileBuffer: Buffer,
): Promise<z.infer<typeof GeminiExtractedSchema>> {
  const csv = excelToCsv(fileBuffer);
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent(
    `${buildExcelExtractionPrompt(ownerName)}\n\nContenuto del documento (tabella CSV):\n${csv}`,
  );

  const extracted = GeminiExtractedSchema.parse(parseGeminiJson(result.response.text()));
  // Garanzia doppia: Excel è sempre una fattura emessa dal titolare
  return { ...extracted, type: "out" };
}
