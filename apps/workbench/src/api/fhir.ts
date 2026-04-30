/**
 * Frontend client for the read-only FHIR proxy. All requests go through
 * `/api/connections/:cid/fhir/*` so the auth token never reaches the
 * browser and the resource-type / search-param allow-lists are enforced
 * server-side.
 */

import type {
  Bundle,
  Patient,
  Resource,
} from "fhir/r4";

export const ALLOWED_RESOURCE_TYPES = [
  "Patient",
  "Condition",
  "MedicationRequest",
  "AllergyIntolerance",
  "Encounter",
  "Observation",
] as const;
export type AllowedResourceType = (typeof ALLOWED_RESOURCE_TYPES)[number];

export interface PatientSearchParams {
  name?: string;
  identifier?: string;
  birthdate?: string;
  gender?: string;
  count?: number;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // ignore
  }
  if (!res.ok) {
    const detail =
      body && typeof body === "object"
        ? JSON.stringify(body)
        : String(body ?? res.statusText);
    throw new Error(`${res.status} ${res.statusText}: ${detail}`);
  }
  return body as T;
}

function fhirUrl(connectionId: string, path: string, query?: URLSearchParams) {
  const base = `/api/connections/${encodeURIComponent(connectionId)}/fhir/${path}`;
  return query && query.toString() ? `${base}?${query}` : base;
}

export async function searchPatients(
  connectionId: string,
  params: PatientSearchParams,
): Promise<Bundle> {
  const q = new URLSearchParams();
  if (params.name) q.set("name", params.name);
  if (params.identifier) q.set("identifier", params.identifier);
  if (params.birthdate) q.set("birthdate", params.birthdate);
  if (params.gender) q.set("gender", params.gender);
  q.set("_count", String(Math.min(params.count ?? 20, 100)));
  return getJson<Bundle>(fhirUrl(connectionId, "Patient", q));
}

export async function getPatient(
  connectionId: string,
  patientId: string,
): Promise<Patient> {
  return getJson<Patient>(
    fhirUrl(connectionId, `Patient/${encodeURIComponent(patientId)}`),
  );
}

export async function searchByPatient(
  connectionId: string,
  resourceType: Exclude<AllowedResourceType, "Patient">,
  patientId: string,
  extra?: Record<string, string>,
): Promise<Bundle> {
  const q = new URLSearchParams();
  q.set("patient", `Patient/${patientId}`);
  q.set("_count", "50");
  if (extra) {
    for (const [k, v] of Object.entries(extra)) q.set(k, v);
  }
  return getJson<Bundle>(fhirUrl(connectionId, resourceType, q));
}

export async function readResource<T extends Resource = Resource>(
  connectionId: string,
  resourceType: AllowedResourceType,
  resourceId: string,
): Promise<T> {
  return getJson<T>(
    fhirUrl(
      connectionId,
      `${resourceType}/${encodeURIComponent(resourceId)}`,
    ),
  );
}

export function bundleEntries<T extends Resource = Resource>(
  bundle: Bundle | undefined,
): T[] {
  return (
    (bundle?.entry
      ?.map((e) => e.resource as T | undefined)
      .filter((r): r is T => Boolean(r)) ?? [])
  );
}
