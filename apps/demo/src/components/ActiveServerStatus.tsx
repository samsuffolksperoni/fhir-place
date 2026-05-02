import { useEffect, useState } from "react";
import { ACTIVE_SERVER_CONFIG } from "../config.js";
import { probeFhirServer, type ProbeResult } from "../serverProbe.js";

type Status =
  | { kind: "pending" }
  | { kind: "ok"; software?: string; fhirVersion?: string }
  | { kind: "error"; message: string };

/**
 * Header readout used when the env override pins the base URL: shows the
 * resolved server label plus a green "ACTIVE" pill once a `/metadata` probe
 * succeeds. Mirrors the SettingsPage's active-pill styling so the deployed
 * site looks the same as local dev.
 */
export function ActiveServerStatus() {
  const [status, setStatus] = useState<Status>({ kind: "pending" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result: ProbeResult = await probeFhirServer(ACTIVE_SERVER_CONFIG);
      if (cancelled) return;
      if (result.ok) {
        setStatus({
          kind: "ok",
          ...(result.software ? { software: result.software } : {}),
          ...(result.fhirVersion ? { fhirVersion: result.fhirVersion } : {}),
        });
      } else {
        setStatus({ kind: "error", message: result.message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="flex items-center gap-2 text-xs text-slate-500"
      data-testid="base-url"
    >
      <span className="text-slate-700">{ACTIVE_SERVER_CONFIG.label}</span>
      <Pill status={status} />
    </div>
  );
}

function Pill({ status }: { status: Status }) {
  if (status.kind === "pending") {
    return (
      <span
        className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500"
        data-testid="active-server-pill-pending"
      >
        Checking…
      </span>
    );
  }
  if (status.kind === "ok") {
    const title = [status.software, status.fhirVersion && `FHIR ${status.fhirVersion}`]
      .filter(Boolean)
      .join(" · ");
    return (
      <span
        className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] uppercase text-emerald-700"
        data-testid="active-server-pill-ok"
        title={title || undefined}
      >
        Active
      </span>
    );
  }
  return (
    <span
      className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] uppercase text-red-700"
      data-testid="active-server-pill-error"
      title={status.message}
    >
      Offline
    </span>
  );
}
