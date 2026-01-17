import { z } from "zod";
import {
  ContactLeadInputSchema,
  type ContactLeadInput,
} from "../shared/contact";
import { DATA_SOURCE } from "./config";
import { apiRequest } from "./api";

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function readLeadList(): unknown[] {
  const raw = localStorage.getItem("impronta_contact_leads");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function submitContactLead(
  input: ContactLeadInput
): Promise<{ ok: true }> {
  const payload = ContactLeadInputSchema.parse(input);

  if (DATA_SOURCE === "api") {
    await apiRequest(z.object({ ok: z.literal(true) }), "/contact", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return { ok: true };
  }

  await delay(200);

  const list = readLeadList();
  list.unshift({ ...payload, createdAt: new Date().toISOString() });
  localStorage.setItem("impronta_contact_leads", JSON.stringify(list));

  return { ok: true };
}
