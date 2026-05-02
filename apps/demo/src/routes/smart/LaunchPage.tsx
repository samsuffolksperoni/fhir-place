import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  DEFAULT_SMART_SCOPE,
  loadServers,
  type ServerConfig,
} from "../../config.js";
import { smartAuthorize } from "../../smart/smartSession.js";

/** Normalize a FHIR base URL for host-based matching (strip path, lowercase). */
function extractHost(url: string): string {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * EHR-initiated SMART App Launch entry point.
 *
 * When an EHR launches this app it redirects here with:
 *   ?iss=<fhir-base-url>&launch=<opaque-handle>
 *
 * This page looks up the matching ServerConfig by host, then calls
 * FHIR.oauth2.authorize() which immediately redirects the browser to the
 * authorization server. The user never "sees" this page — they see the EHR
 * consent screen instead.
 */
export function LaunchPage() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const launched = useRef(false);

  useEffect(() => {
    if (launched.current) return;
    launched.current = true;

    const iss = searchParams.get("iss");
    const launch = searchParams.get("launch");

    if (!iss) {
      setError("Missing required parameter: iss");
      return;
    }

    // Find a stored SMART server whose base URL host matches the EHR's iss.
    const servers = loadServers();
    const issHost = extractHost(iss);
    const matched: ServerConfig | undefined = servers.find(
      (s) => s.authMode === "smart" && extractHost(s.baseUrl) === issHost,
    );

    const server: ServerConfig = matched ?? {
      id: "ehr-launch-ephemeral",
      label: "EHR Launch",
      baseUrl: iss,
      authMode: "smart",
      smart: {
        clientId: import.meta.env.VITE_DEFAULT_SMART_CLIENT_ID ?? "fhir-place-demo",
        scope: DEFAULT_SMART_SCOPE,
      },
    };

    smartAuthorize(server, launch ? { iss, launch } : undefined).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : String(err));
    });
  }, [searchParams]);

  if (error) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-6 text-red-800">
        <h1 className="mb-1 text-lg font-semibold">SMART Launch Error</h1>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
      <p className="text-sm">Redirecting to authorization server…</p>
    </div>
  );
}
