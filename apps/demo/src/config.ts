export const USE_MOCK =
  import.meta.env.VITE_USE_MOCK === "true" || import.meta.env.DEV;

/** Vite's BASE_URL — "/" locally, "/fhir-place/" on GitHub Pages. */
const BASE = import.meta.env.BASE_URL;

/**
 * Public FHIR R4 test servers offered in the demo's server picker. The first
 * entry is the default. All listed servers must support open (no-auth) access
 * and CORS so the browser can reach them directly. Demonstrates that
 * `@fhir-place/react-fhir` is server-agnostic — drop in any FHIR REST API.
 */
export const FHIR_SERVERS = [
  { label: "HAPI Public Test Server", url: "https://hapi.fhir.org/baseR4" },
  { label: "SMART Health IT (R4)", url: "https://r4.smarthealthit.org" },
] as const satisfies ReadonlyArray<{ label: string; url: string }>;

const DEFAULT_LIVE_URL: string = FHIR_SERVERS[0].url;

const SERVER_STORAGE_KEY = "fhir-place:base-url";

const isKnownServer = (url: string): boolean =>
  FHIR_SERVERS.some((s) => s.url === url);

const getStoredBaseUrl = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(SERVER_STORAGE_KEY);
    return stored && isKnownServer(stored) ? stored : null;
  } catch {
    return null;
  }
};

export const setStoredFhirBaseUrl = (url: string): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SERVER_STORAGE_KEY, url);
  } catch {
    // localStorage may be unavailable (private mode); the picker just won't persist.
  }
};

export const FHIR_BASE_URL: string =
  import.meta.env.VITE_FHIR_BASE_URL ??
  (USE_MOCK ? `${BASE}fhir` : (getStoredBaseUrl() ?? DEFAULT_LIVE_URL));

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
