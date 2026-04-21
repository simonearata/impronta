import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { GeminiExtractedSchema } from "./schemas.js";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function buildExtractionPrompt(ownerName: string): string {
  return `Analizza questa fattura o documento commerciale ed estrai i dati strutturati.

CONTESTO: il titolare di questo sistema è "${ownerName}". Determina il tipo dal suo punto di vista:
- "in" se la fattura è emessa da un fornitore VERSO ${ownerName} (acquisto, bottiglie in entrata)
- "out" se la fattura è emessa DA ${ownerName} verso un cliente (vendita, bottiglie in uscita)

Restituisci SOLO un oggetto JSON valido (nessun testo aggiuntivo, nessun markdown):
{
  "type": "in" oppure "out" come descritto sopra,
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
}

REGOLE IMPORTANTI:
- Includi SOLO le righe di vino o bevanda alcolica
- Escludi: KEG, fusti, imballi, trasporti, accessori, casse vuote
- Se il prezzo ha uno sconto applicato, calcola il prezzo unitario netto dopo lo sconto (prezzo × (1 - sconto%))
- La quantità è in bottiglie (non casse)
- Per il nome del vino includi l'annata se riportata nel documento`;
}

export function isSupportedMime(mime: string): boolean {
  return ALLOWED_MIME.has(mime);
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
    {
      inlineData: {
        mimeType,
        data: fileBuffer.toString("base64"),
      },
    },
    buildExtractionPrompt(ownerName),
  ]);

  const raw = result.response.text().trim();

  const json = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return GeminiExtractedSchema.parse(JSON.parse(json));
}
