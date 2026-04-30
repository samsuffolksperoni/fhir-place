import type { DataConnection } from "../../db/schema.js";

export type CapabilityProbeResult =
  | {
      ok: true;
      fhirVersion: string | null;
      software: string | null;
      raw: unknown;
    }
  | {
      ok: false;
      error: string;
    };

/**
 * Build the auth headers for a connection. Phase A only supports `none` and
 * `bearer`; any other value is treated as `none` so a misconfigured row
 * cannot leak a header.
 */
export function authHeadersFor(
  conn: Pick<DataConnection, "authType" | "authToken">,
): Record<string, string> {
  if (conn.authType === "bearer" && conn.authToken) {
    return { Authorization: `Bearer ${conn.authToken}` };
  }
  return {};
}

/**
 * Fetch a CapabilityStatement from the configured FHIR server.
 *
 * This is a thin wrapper around `fetch`; we deliberately do not reuse
 * `@fhir-place/react-fhir`'s `FetchFhirClient` here because it is an
 * abstraction over patient/resource reads, and the metadata endpoint is a
 * one-shot probe that we want to inspect at the HTTP level (status code,
 * content-type, body parse errors).
 *
 * `fetchFn` is injectable so tests can substitute a stub without a global
 * mock.
 */
export async function probeCapabilityStatement(
  conn: Pick<DataConnection, "baseUrl" | "authType" | "authToken">,
  fetchFn: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<CapabilityProbeResult> {
  const url = `${conn.baseUrl.replace(/\/$/, "")}/metadata`;
  let response: Response;
  try {
    response = await fetchFn(url, {
      method: "GET",
      headers: {
        Accept: "application/fhir+json",
        ...authHeadersFor(conn),
      },
      ...(signal ? { signal } : {}),
    });
  } catch (err) {
    return { ok: false, error: `network error: ${stringifyError(err)}` };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: `HTTP ${response.status} ${response.statusText || ""}`.trim(),
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (err) {
    return { ok: false, error: `invalid JSON: ${stringifyError(err)}` };
  }

  const cap = body as Record<string, unknown> | null;
  if (!cap || cap["resourceType"] !== "CapabilityStatement") {
    return {
      ok: false,
      error: `unexpected resource: got ${String(cap?.["resourceType"] ?? "null")}`,
    };
  }

  const software = cap["software"] as { name?: string; version?: string } | undefined;
  return {
    ok: true,
    fhirVersion: typeof cap["fhirVersion"] === "string" ? (cap["fhirVersion"] as string) : null,
    software: software?.name
      ? `${software.name}${software.version ? ` ${software.version}` : ""}`
      : null,
    raw: body,
  };
}

function stringifyError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
