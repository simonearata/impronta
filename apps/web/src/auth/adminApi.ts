import { z } from "zod";
import { clearSession, readSession, writeSession } from "./storage";
import * as client from "./client";

const API_URL = String(import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function fetchJson(path: string, init?: RequestInit) {
  if (!API_URL) throw new Error("VITE_API_URL mancante");

  const hdrs: Record<string, string> = { ...((init?.headers as any) || {}) };
  if (init?.body) hdrs["Content-Type"] = "application/json";

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: hdrs,
  });

  const text = await res.text().catch(() => "");
  const json = text
    ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      })()
    : null;

  return { res, json };
}

export async function adminUploadRequest<T>(
  schema: z.ZodType<T>,
  path: string,
  formData: FormData,
): Promise<T> {
  const s0 = readSession();
  if (!s0?.accessToken) throw new Error("Non autenticato");

  if (!API_URL) throw new Error("VITE_API_URL mancante");

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${s0.accessToken}` },
    body: formData,
  });

  const text = await res.text().catch(() => "");
  const json = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;

  if (!res.ok) {
    const msg = typeof json === "string" ? json
      : json && typeof json === "object" && "message" in (json as any)
        ? String((json as any).message)
        : `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  return schema.parse(json);
}

export async function adminRequest<T>(
  schema: z.ZodType<T>,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const s0 = readSession();
  if (!s0?.accessToken) throw new Error("Non autenticato");

  const doReq = async (accessToken: string) => {
    const { res, json } = await fetchJson(path, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (res.status === 401) {
      const err: any = new Error(
        typeof json === "string" ? json : "Unauthorized",
      );
      err.status = 401;
      throw err;
    }

    if (!res.ok) {
      const msg =
        typeof json === "string"
          ? json
          : json && typeof json === "object" && "message" in (json as any)
            ? String((json as any).message)
            : `Request failed: ${res.status}`;
      throw new Error(msg);
    }

    return schema.parse(json);
  };

  try {
    return await doReq(s0.accessToken);
  } catch (e: any) {
    if (e?.status !== 401) throw e;

    const s1 = readSession();
    if (!s1?.refreshToken) {
      clearSession();
      throw new Error("Sessione scaduta, rifai login");
    }

    try {
      const next = await client.refresh(s1.refreshToken);
      writeSession(next);
      return await doReq(next.accessToken);
    } catch {
      clearSession();
      throw new Error("Sessione scaduta, rifai login");
    }
  }
}
