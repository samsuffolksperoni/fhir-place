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

  http.get(`${BASE}/StructureDefinition/Patient`, () =>
    okJson(patientStructureDefinition),
  ),
  http.get(`${BASE}/StructureDefinition/Observation`, () =>
    okJson(observationStructureDefinition),
  ),

  http.get(`${BASE}/Patient`, ({ request }) => {
    const url = new URL(request.url);
    const qp = url.searchParams;
    const name = qp.get("name")?.toLowerCase();
    const family = qp.get("family")?.toLowerCase();
    const given = qp.get("given")?.toLowerCase();
    const gender = qp.get("gender");
    const city = qp.get("address-city")?.toLowerCase();
    const count = Number(qp.get("_count") ?? 20);
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
