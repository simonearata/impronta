import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { WineType } from "./types";

export function cn(...inputs: Array<string | undefined | null | false>) {
  return twMerge(clsx(inputs));
}

export function wineTypeLabel(t: WineType) {
  switch (t) {
    case "white":
      return "Bianco";
    case "red":
      return "Rosso";
    case "rose":
      return "Rosé";
    case "orange":
      return "Orange";
    case "sparkling":
      return "Spumante";
    case "other":
      return "Altro";
  }
}

export function formatPriceEUR(priceCents: number | null) {
  if (priceCents == null) return null;
  return (priceCents / 100).toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
  });
}

export function absoluteUrl(pathname: string) {
  const base =
    import.meta.env.VITE_SITE_URL?.replace(/\/$/, "") || window.location.origin;
  return `${base}${pathname.startsWith("/") ? "" : "/"}${pathname}`;
}
