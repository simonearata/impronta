export const DATA_SOURCE = (import.meta.env.VITE_DATA_SOURCE || "mock") as
  | "mock"
  | "api";

export const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const ACCESS_TOKEN_KEY = "impronta_access_token";
