import type { FhirResource } from "./types.js";

/**
 * Build a `fetch` function that pretends to be a FHIR R4 server hosting
 * the given patient compartment.
 *
 * Supported reads:
 *   GET <baseUrl>/Patient/<id>           → 200 + the Patient resource (or 404)
 *   GET <baseUrl>/<Type>?patient=…&…     → 200 + Bundle searchset of matching resources
 *
 * Filtering: a search returns resources whose `subject.reference` or
 * `patient.reference` is `Patient/<id>` (matching the bundle's patient).
 * Other query params (`clinical-status`, `status`, `category`, `date`)
 * are honoured for the resource types where they apply.
 *
 * Anything else returns 404 with an `OperationOutcome` body so the FHIR
 * proxy's error handling exercises naturally.
 */
export function buildFakeFhirFetch(args: {
  baseUrl: string;
  patientId: string;
  bundle: ReadonlyArray<FhirResource>;
}): typeof fetch {
  const baseUrl = args.baseUrl.replace(/\/$/, "");
  const expectedPatientRef = `Patient/${args.patientId}`;

  return async (input) => {
    const urlStr = String(input);
    if (!urlStr.startsWith(baseUrl)) return notFound(urlStr);

    const path = urlStr.slice(baseUrl.length);
    const [route = "", qs = ""] = path.split("?");
    const segments = route.replace(/^\//, "").split("/");

    if (segments.length === 2 && segments[0] === "Patient") {
      const id = segments[1];
      const resource = args.bundle.find(
        (r) => r.resourceType === "Patient" && (r as { id?: string }).id === id,
      );
      return resource ? fhirJson(resource) : notFound(urlStr);
    }

    if (segments.length === 1) {
      const resourceType = segments[0];
      const params = new URLSearchParams(qs);

      // Phase A's tools always set `patient=Patient/<id>` and `_count=N`.
      const wantPatient = params.get("patient");
      if (wantPatient && wantPatient !== expectedPatientRef) {
        return fhirJson(emptyBundle());
      }

      const limit = clampLimitParam(params.get("_count"));
      const filtered = args.bundle.filter(
        (r) =>
          r.resourceType === resourceType &&
          subjectRefMatches(r, expectedPatientRef) &&
          paramsMatch(r, params, resourceType),
      );
      return fhirJson(searchset(filtered.slice(0, limit)));
    }

    return notFound(urlStr);
  };
}

function fhirJson(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/fhir+json" },
  });
}

function notFound(url: string): Response {
  return new Response(
    JSON.stringify({
      resourceType: "OperationOutcome",
      issue: [
        { severity: "error", code: "not-found", diagnostics: `not found: ${url}` },
      ],
    }),
    {
      status: 404,
      headers: { "Content-Type": "application/fhir+json" },
    },
  );
}

function emptyBundle(): unknown {
  return {
    resourceType: "Bundle",
    type: "searchset",
    total: 0,
    entry: [],
  };
}

function searchset(resources: ReadonlyArray<FhirResource>): unknown {
  return {
    resourceType: "Bundle",
    type: "searchset",
    total: resources.length,
    entry: resources.map((resource) => ({ resource })),
  };
}

function clampLimitParam(value: string | null): number {
  if (!value) return 50;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 50;
  return Math.min(Math.floor(n), 100);
}

function subjectRefMatches(resource: FhirResource, expectedRef: string): boolean {
  const r = resource as {
    resourceType?: string;
    subject?: { reference?: string };
    patient?: { reference?: string };
  };
  if (r.resourceType === "Patient") return false;
  return (
    r.subject?.reference === expectedRef ||
    r.patient?.reference === expectedRef
  );
}

/**
 * Honour the per-resource-type filters Phase A's tools forward to the
 * server. Any param the harness doesn't know is ignored — the tool
 * tests already cover proxy-level filtering; this just makes the eval
 * cases more realistic.
 */
function paramsMatch(
  resource: FhirResource,
  params: URLSearchParams,
  resourceType: string,
): boolean {
  if (resourceType === "Condition") {
    const want = params.get("clinical-status");
    if (want) {
      const r = resource as { clinicalStatus?: { coding?: Array<{ code?: string }> } };
      const codes = r.clinicalStatus?.coding?.map((c) => c.code) ?? [];
      if (!codes.includes(want)) return false;
    }
  }
  if (resourceType === "MedicationRequest") {
    const want = params.get("status");
    if (want) {
      const r = resource as { status?: string };
      if (r.status !== want) return false;
    }
  }
  if (resourceType === "Encounter") {
    const want = params.get("status");
    if (want) {
      const r = resource as { status?: string };
      if (r.status !== want) return false;
    }
    if (!matchesDateRange(resource, params, encounterDate)) return false;
  }
  if (resourceType === "Observation") {
    const wantCat = params.get("category");
    if (wantCat) {
      const r = resource as {
        category?: Array<{ coding?: Array<{ code?: string }> }>;
      };
      const cats =
        r.category?.flatMap((c) => c.coding?.map((co) => co.code) ?? []) ?? [];
      if (!cats.includes(wantCat)) return false;
    }
    if (!matchesDateRange(resource, params, observationDate)) return false;
  }
  return true;
}

/**
 * Honour FHIR `date=ge<YYYY-MM-DD>` and `date=le<YYYY-MM-DD>` filters.
 * The Phase A tools forward `date` as the param name for both Encounter
 * (`Encounter.period.start`) and Observation
 * (`Observation.effectiveDateTime`); the resource-shape lookup is
 * provided per-resource-type by the caller.
 */
function matchesDateRange(
  resource: FhirResource,
  params: URLSearchParams,
  pickDate: (resource: FhirResource) => string | null,
): boolean {
  const dateParams = params.getAll("date");
  if (dateParams.length === 0) return true;
  const isoDate = pickDate(resource);
  if (!isoDate) return false;
  for (const raw of dateParams) {
    const op = raw.slice(0, 2);
    const value = raw.slice(2);
    if (!value) continue;
    if (op === "ge" && isoDate < value) return false;
    if (op === "le" && isoDate > value) return false;
    if (op === "gt" && !(isoDate > value)) return false;
    if (op === "lt" && !(isoDate < value)) return false;
    if (op === "eq" && isoDate !== value) return false;
  }
  return true;
}

function encounterDate(resource: FhirResource): string | null {
  const r = resource as { period?: { start?: string; end?: string } };
  return r.period?.start?.slice(0, 10) ?? r.period?.end?.slice(0, 10) ?? null;
}

function observationDate(resource: FhirResource): string | null {
  const r = resource as {
    effectiveDateTime?: string;
    effectivePeriod?: { start?: string; end?: string };
    issued?: string;
  };
  return (
    r.effectiveDateTime?.slice(0, 10) ??
    r.effectivePeriod?.start?.slice(0, 10) ??
    r.issued?.slice(0, 10) ??
    null
  );
}
