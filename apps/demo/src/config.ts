export const USE_MOCK =
  import.meta.env.VITE_USE_MOCK === "true" || import.meta.env.DEV;

/** Vite's BASE_URL — "/" locally, "/fhir-place/" on GitHub Pages. */
const BASE = import.meta.env.BASE_URL;

export const FHIR_BASE_URL: string =
  import.meta.env.VITE_FHIR_BASE_URL ??
  (USE_MOCK ? `${BASE}fhir` : "https://hapi.fhir.org/baseR4");

export const ROUTER_BASENAME: string = BASE.replace(/\/$/, "") || "/";
