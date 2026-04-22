import { http, HttpResponse } from "msw";
import type { Patient } from "fhir/r4";
import {
  observationsFor,
  observationStructureDefinition,
  patients,
  patientStructureDefinition,
  searchBundle,
} from "./fixtures.js";

const BASE = "/fhir";

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
  http.get(`${BASE}/metadata`, () =>
    okJson({
      resourceType: "CapabilityStatement",
      status: "active",
      fhirVersion: "4.0.1",
      format: ["json"],
      rest: [
        {
          mode: "server",
          resource: [
            { type: "Patient", interaction: [{ code: "read" }, { code: "search-type" }, { code: "create" }, { code: "update" }, { code: "delete" }] },
            { type: "Observation", interaction: [{ code: "read" }, { code: "search-type" }] },
          ],
        },
      ],
    }),
  ),

  http.get(`${BASE}/StructureDefinition/Patient`, () =>
    okJson(patientStructureDefinition),
  ),
  http.get(`${BASE}/StructureDefinition/Observation`, () =>
    okJson(observationStructureDefinition),
  ),

  http.get(`${BASE}/Patient`, ({ request }) => {
    const url = new URL(request.url);
    const name = url.searchParams.get("name")?.toLowerCase();
    const count = Number(url.searchParams.get("_count") ?? 20);
    const all = Array.from(store.patients.values());
    const filtered = name
      ? all.filter((p) =>
          p.name?.some(
            (n) =>
              (n.family ?? "").toLowerCase().includes(name) ||
              (n.given ?? []).some((g) => g.toLowerCase().includes(name)),
          ),
        )
      : all;
    return okJson(searchBundle(filtered.slice(0, count)));
  }),

  http.get(`${BASE}/Patient/:id`, ({ params }) => {
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

  http.post(`${BASE}/Patient`, async ({ request }) => {
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

  http.put(`${BASE}/Patient/:id`, async ({ params, request }) => {
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

  http.delete(`${BASE}/Patient/:id`, ({ params }) => {
    store.patients.delete(String(params.id));
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${BASE}/Observation`, ({ request }) => {
    const url = new URL(request.url);
    const subject = url.searchParams.get("subject") ?? url.searchParams.get("patient");
    const id = subject?.replace(/^Patient\//, "") ?? "";
    return okJson(searchBundle(observationsFor(id)));
  }),
];
