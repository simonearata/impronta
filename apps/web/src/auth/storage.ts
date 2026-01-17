import type { z } from "zod";
import { AuthSessionSchema } from "../shared/schemas";

export type AuthSession = z.infer<typeof AuthSessionSchema>;

const KEY = "impronta_auth_v1";

export function readSession(): AuthSession | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return AuthSessionSchema.parse(parsed);
  } catch {
    return null;
  }
}

export function writeSession(session: AuthSession) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}
