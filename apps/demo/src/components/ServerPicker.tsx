import type { ChangeEvent } from "react";
import { FHIR_BASE_URL, FHIR_SERVERS, setStoredFhirBaseUrl } from "../config.js";

/**
 * Header dropdown that lets visitors point the demo at any FHIR R4 server in
 * `FHIR_SERVERS`. Persisted to localStorage and applied via a full reload so
 * the singleton `FetchFhirClient` in `main.tsx` rebuilds with the new base URL
 * (and TanStack Query's cache is dropped along with it).
 */
export function ServerPicker() {
  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;
    if (next === FHIR_BASE_URL) return;
    setStoredFhirBaseUrl(next);
    window.location.reload();
  };

  return (
    <label
      className="flex items-center gap-2 text-xs text-slate-500"
      data-testid="base-url"
    >
      <span>live ·</span>
      <select
        value={FHIR_BASE_URL}
        onChange={onChange}
        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
        data-testid="server-picker"
        aria-label="FHIR server"
      >
        {FHIR_SERVERS.map((server) => (
          <option key={server.url} value={server.url}>
            {server.label} — {server.url}
          </option>
        ))}
      </select>
    </label>
  );
}
