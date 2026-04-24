export const USE_MOCK =
  import.meta.env.VITE_USE_MOCK === "true" || import.meta.env.DEV;

/** Vite's BASE_URL — "/" locally, "/fhir-place/" on GitHub Pages. */
const BASE = import.meta.env.BASE_URL;

export const FHIR_BASE_URL: string =
  import.meta.env.VITE_FHIR_BASE_URL ??
  (USE_MOCK ? `${BASE}fhir` : "https://hapi.fhir.org/baseR4");

export const ROUTER_BASENAME: string = BASE.replace(/\/$/, "") || "/";

/**
 * Use HashRouter when the app is hosted on a static path other than the
 * server root (e.g. `/fhir-place/` on GitHub Pages). Hash-based URLs avoid
 * HTTP 404s on direct deep-link loads because static hosts only serve files
 * that exist; they have no way to know `/fhir-place/Patient` is a virtual
 * SPA route. See issue #47.
 */
export const USE_HASH_ROUTER: boolean =
  import.meta.env.VITE_USE_HASH_ROUTER === "true" ||
  (BASE !== "/" && !import.meta.env.DEV);
