import { z } from "zod";
import { ACCESS_TOKEN_KEY, API_URL, DATA_SOURCE } from "./config";

type ApiOptions = { auth?: boolean };

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || "";
}

export async function apiRequest<T>(
  schema: z.ZodType<T>,
  path: string,
  init?: RequestInit,
  opts?: ApiOptions
): Promise<T> {
  if (DATA_SOURCE !== "api") {
    throw new Error("DATA_SOURCE non è 'api'.");
  }
  if (!API_URL) {
    throw new Error("VITE_API_URL mancante (DATA_SOURCE=api).");
  }

  const headers = new Headers(init?.headers || {});
  if (!headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");

  if (opts?.auth) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }

  const ct = res.headers.get("content-type") || "";
  const json = ct.includes("application/json")
    ? await res.json().catch(() => ({}))
    : await res.text().catch(() => "");

  return schema.parse(json);
}
