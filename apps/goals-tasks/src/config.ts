export const USE_MOCK =
  import.meta.env.VITE_USE_MOCK === "true" || import.meta.env.DEV;

const BASE = import.meta.env.BASE_URL;

export const FHIR_BASE_URL: string =
  import.meta.env.VITE_FHIR_BASE_URL ??
  (USE_MOCK ? `${BASE}fhir` : "https://hapi.fhir.org/baseR4");

export const ROUTER_BASENAME: string = BASE.replace(/\/$/, "") || "/";

/** Hardcoded "current" patient for this demo — in a real app this would come from SMART launch context or a picker. */
export const DEMO_PATIENT_ID = "demo-patient";
