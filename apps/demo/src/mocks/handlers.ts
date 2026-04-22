import { http, HttpResponse } from "msw";
import type { Patient, Resource } from "fhir/r4";
import { FHIR_BASE_URL } from "../config.js";
import {
  allergiesFor,
  conditionsFor,
  encountersFor,
  immunizationsFor,
  medicationRequestsFor,
  observationsFor,
  observationStructureDefinition,
  patients,
  patientStructureDefinition,
  proceduresFor,
  searchBundle,
} from "./fixtures.js";

// Share the base URL with the client. Dev → "/fhir"; GH Pages → "/fhir-place/fhir".
// A hardcoded "/fhir" here caused a production-only 404 when the app was served
// under a non-root base path (see #8).
const BASE = FHIR_BASE_URL;

// Mutable in-memory store so create/update/delete actually persist during the session.
const store = {
  patients: new Map<string, Patient>(patients.map((p) => [p.id!, p])),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const okJson = (data: any, init?: ResponseInit) =>
  HttpResponse.json(data, {
    ...init,
    headers: {
      "Content-Type": "application/fhir+json",
      ...init?.headers,
    },
  });

export const handlers = [
  http.get(`*${BASE}/metadata`, () =>
    okJson({
      resourceType: "CapabilityStatement",
      status: "active",
      date: "2024-01-01",
      kind: "instance",
      fhirVersion: "4.0.1",
      format: ["json"],
      rest: [
        {
          mode: "server",
          resource: [
            {
              type: "Patient",
              interaction: [
                { code: "read" },
                { code: "search-type" },
                { code: "create" },
                { code: "update" },
                { code: "delete" },
              ],
              searchParam: [
                { name: "_id", type: "token", documentation: "Logical id" },
                { name: "name", type: "string", documentation: "Any of the names" },
                { name: "family", type: "string", documentation: "Family name" },
                { name: "given", type: "string", documentation: "Given name" },
                { name: "identifier", type: "token" },
                { name: "birthdate", type: "date" },
                { name: "gender", type: "token" },
                { name: "address-city", type: "string" },
                { name: "phone", type: "token" },
                { name: "email", type: "token" },
              ],
            },
            {
              type: "Observation",
              interaction: [{ code: "read" }, { code: "search-type" }],
              searchParam: [
                { name: "_id", type: "token" },
                { name: "code", type: "token" },
                { name: "subject", type: "reference" },
                { name: "patient", type: "reference" },
                { name: "status", type: "token" },
                { name: "date", type: "date" },
              ],
            },
          ],
        },
      ],
    }),
  ),

  http.get(`*${BASE}/StructureDefinition/Patient`, () =>
    okJson(patientStructureDefinition),
  ),
  http.get(`*${BASE}/StructureDefinition/Observation`, () =>
    okJson(observationStructureDefinition),
  ),

  http.get(`*${BASE}/Patient`, ({ request }) => {
    const url = new URL(request.url);
    const qp = url.searchParams;
    const name = qp.get("name")?.toLowerCase();
    const family = qp.get("family")?.toLowerCase();
    const given = qp.get("given")?.toLowerCase();
    const gender = qp.get("gender");
    const city = qp.get("address-city")?.toLowerCase();
    const count = Number(qp.get("_count") ?? 20);
    const offset = Number(qp.get("_getpagesoffset") ?? 0);
    const all = Array.from(store.patients.values());
    const filtered = all.filter((p) => {
      if (name && !p.name?.some((n) =>
        (n.family ?? "").toLowerCase().includes(name) ||
        (n.given ?? []).some((g) => g.toLowerCase().includes(name)),
      )) return false;
      if (family && !p.name?.some((n) => (n.family ?? "").toLowerCase().includes(family))) return false;
      if (given && !p.name?.some((n) => (n.given ?? []).some((g) => g.toLowerCase().includes(given)))) return false;
      if (gender && p.gender !== gender) return false;
      if (city && !p.address?.some((a) => (a.city ?? "").toLowerCase().includes(city))) return false;
      return true;
    });
    const page = filtered.slice(offset, offset + count);
    const bundle = searchBundle(page);
    bundle.total = filtered.length;
    const nextOffset = offset + count;
    if (nextOffset < filtered.length) {
      const nextUrl = new URL(url);
      nextUrl.searchParams.set("_getpagesoffset", String(nextOffset));
      bundle.link = [
        { relation: "self", url: request.url },
        { relation: "next", url: nextUrl.toString() },
      ];
    }
    return okJson(bundle);
  }),

  http.get(`*${BASE}/Patient/:id`, ({ params }) => {
    const p = store.patients.get(String(params.id));
    if (!p) {
      return okJson(
        {
          resourceType: "OperationOutcome",
          issue: [
            { severity: "error", code: "not-found", diagnostics: `Patient/${params.id} not found` },
          ],
        },
        { status: 404 },
      );
    }
    return okJson(p);
  }),

  http.post(`*${BASE}/Patient`, async ({ request }) => {
    const body = (await request.json()) as Patient;
    const id = body.id ?? `p-${Date.now()}`;
    const created: Patient = {
      ...body,
      id,
      meta: { versionId: "1", lastUpdated: new Date().toISOString() },
    };
    store.patients.set(id, created);
    return okJson(created, { status: 201 });
  }),

  http.put(`*${BASE}/Patient/:id`, async ({ params, request }) => {
    const id = String(params.id);
    const body = (await request.json()) as Patient;
    const prev = store.patients.get(id);
    const versionId = String(Number(prev?.meta?.versionId ?? "0") + 1);
    const updated: Patient = {
      ...body,
      id,
      meta: { versionId, lastUpdated: new Date().toISOString() },
    };
    store.patients.set(id, updated);
    return okJson(updated);
  }),

  http.delete(`*${BASE}/Patient/:id`, ({ params }) => {
    store.patients.delete(String(params.id));
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`*${BASE}/Observation`, ({ request }) => {
    const url = new URL(request.url);
    const subject = url.searchParams.get("subject") ?? url.searchParams.get("patient");
    const id = subject?.replace(/^Patient\//, "") ?? "";
    return okJson(searchBundle(observationsFor(id)));
  }),

  // Compartment search handlers — each looks up the patient ref in ?patient=
  // or ?subject= and returns the matching fixture records.
  ...(() => {
    const patientIdFromRequest = (request: Request): string => {
      const qp = new URL(request.url).searchParams;
      const ref = qp.get("patient") ?? qp.get("subject");
      return ref?.replace(/^Patient\//, "") ?? "";
    };
    const compartmentHandler = <T extends Resource>(
      type: string,
      source: (id: string) => T[],
    ) =>
      http.get(`*${BASE}/${type}`, ({ request }) =>
        okJson(searchBundle(source(patientIdFromRequest(request)))),
      );
    return [
      compartmentHandler("Condition", conditionsFor),
      compartmentHandler("MedicationRequest", medicationRequestsFor),
      compartmentHandler("AllergyIntolerance", allergiesFor),
      compartmentHandler("Procedure", proceduresFor),
      compartmentHandler("Encounter", encountersFor),
      compartmentHandler("Immunization", immunizationsFor),
    ];
  })(),
];
