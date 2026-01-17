import { z } from "zod";
import { readSession, writeSession } from "./storage";
import * as client from "./client";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const ContactLeadOutSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  subject: z.string(),
  message: z.string(),
  createdAt: z.string(),
});

export type ContactLead = z.infer<typeof ContactLeadOutSchema>;

function getApiUrl() {
  if (!API_URL) throw new Error("VITE_API_URL mancante");
  return API_URL;
}

async function rawRequest(path: string, init?: RequestInit) {
  const url = `${getApiUrl()}${path}`;
  const res = await fetch(url, init);
  return res;
}

async function requestJson<T>(
  schema: z.ZodType<T>,
  path: string,
  init?: RequestInit,
  triedRefresh = false
): Promise<T> {
  const s = readSession();
  if (!s?.accessToken) throw new Error("Non autenticato");

  const res = await rawRequest(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${s.accessToken}`,
      ...(init?.headers || {}),
    },
  });

  if (res.status === 401 && !triedRefresh) {
    if (!s.refreshToken) throw new Error("Sessione scaduta");

    const next = await client.refresh(s.refreshToken);
    writeSession(next);
    window.dispatchEvent(new Event("impronta:auth-session"));

    return requestJson(schema, path, init, true);
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Request failed: ${res.status}`);
  }

  const json = await res.json().catch(() => ({}));
  return schema.parse(json);
}

export async function listContactLeads(): Promise<ContactLead[]> {
  return requestJson(z.array(ContactLeadOutSchema), "/admin/contact-leads");
}
