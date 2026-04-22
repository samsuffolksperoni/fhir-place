export const USE_MOCK =
  import.meta.env.VITE_USE_MOCK === "true" || import.meta.env.DEV;

export const FHIR_BASE_URL: string =
  import.meta.env.VITE_FHIR_BASE_URL ??
  (USE_MOCK ? "/fhir" : "https://hapi.fhir.org/baseR4");
