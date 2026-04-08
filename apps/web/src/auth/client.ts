import { z } from "zod";
import type { AuthSession } from "./storage";
import { AuthLoginInputSchema } from "../shared/schemas";

const MODE = (import.meta.env.VITE_DATA_SOURCE || "mock") as "mock" | "api";
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

function token() {
  const r = Math.random().toString(36).slice(2);
  return `tok_${r}_${Date.now()}`;
}

const AdminLoginOutSchema = z.object({
  ok: z.literal(true),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

async function apiRequest<T>(
  schema: z.ZodType<T>,
  path: string,
  init?: RequestInit,
): Promise<T> {
  if (!API_URL) throw new Error("VITE_API_URL mancante");

  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Request failed: ${res.status}`);
  }

  const json = await res.json().catch(() => ({}));
  return schema.parse(json);
}

export async function login(
  email: string,
  password: string,
): Promise<AuthSession> {
  const input = AuthLoginInputSchema.parse({ email, password });

  if (MODE === "api") {
    const out = await apiRequest(AdminLoginOutSchema, "/admin/login", {
      method: "POST",
      body: JSON.stringify(input),
    });

    return {
      accessToken: out.accessToken,
      refreshToken: out.refreshToken,
      user: { email: input.email, role: "admin" },
    };
  }

  const adminEmail = String(import.meta.env.VITE_ADMIN_EMAIL || "").trim();
  const adminPassword = String(import.meta.env.VITE_ADMIN_PASSWORD || "");

  if (input.email !== adminEmail || input.password !== adminPassword) {
    throw new Error("Credenziali non valide.");
  }

  return {
    accessToken: token(),
    refreshToken: token(),
    user: { email: input.email, role: "admin" },
  };
}

export async function refresh(refreshToken: string): Promise<AuthSession> {
  if (MODE === "api") {
    const out = await apiRequest(AdminLoginOutSchema, "/admin/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });

    const email = String(
      import.meta.env.VITE_ADMIN_EMAIL || "improntavini@gmail.com",
    ).trim();

    return {
      accessToken: out.accessToken,
      refreshToken: out.refreshToken,
      user: { email, role: "admin" },
    };
  }

  return {
    accessToken: token(),
    refreshToken,
    user: {
      email: String(
        import.meta.env.VITE_ADMIN_EMAIL || "improntavini@gmail.com",
      ),
      role: "admin",
    },
  };
}

export async function logout(accessToken: string): Promise<void> {
  if (MODE === "api") {
    if (!API_URL) throw new Error("VITE_API_URL mancante");
    await fetch(`${API_URL}/admin/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => {});
  }
}
