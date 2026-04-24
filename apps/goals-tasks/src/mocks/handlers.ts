import { http, HttpResponse } from "msw";
import type { Goal, Task } from "fhir/r4";
import { FHIR_BASE_URL } from "../config.js";
import {
  goalStatusValueSet,
  goalStructureDefinition,
  initialGoals,
  initialTasks,
  patientFixture,
  searchBundle,
  taskStatusValueSet,
  taskStructureDefinition,
} from "./fixtures.js";

const BASE = FHIR_BASE_URL;

const store = {
  goals: new Map<string, Goal>(initialGoals.map((g) => [g.id!, g])),
  tasks: new Map<string, Task>(initialTasks.map((t) => [t.id!, t])),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const okJson = (data: any, init?: ResponseInit) =>
  HttpResponse.json(data, {
    ...init,
    headers: { "Content-Type": "application/fhir+json", ...init?.headers },
  });

const nextId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

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
              interaction: [{ code: "read" }, { code: "search-type" }],
              searchParam: [
                { name: "_id", type: "token" },
                { name: "name", type: "string" },
              ],
            },
            {
              type: "Goal",
              interaction: [{ code: "read" }, { code: "search-type" }, { code: "create" }, { code: "update" }, { code: "delete" }],
              searchParam: [
                { name: "_id", type: "token" },
                { name: "patient", type: "reference" },
                { name: "subject", type: "reference" },
                { name: "lifecycle-status", type: "token" },
                { name: "achievement-status", type: "token" },
                { name: "category", type: "token" },
              ],
            },
            {
              type: "Task",
              interaction: [{ code: "read" }, { code: "search-type" }, { code: "create" }, { code: "update" }, { code: "delete" }],
              searchParam: [
                { name: "_id", type: "token" },
                { name: "patient", type: "reference" },
                { name: "subject", type: "reference" },
                { name: "focus", type: "reference" },
                { name: "status", type: "token" },
                { name: "priority", type: "token" },
                { name: "owner", type: "reference" },
              ],
            },
          ],
        },
      ],
    }),
  ),

  // StructureDefinitions
  http.get(`*${BASE}/StructureDefinition/Goal`, () => okJson(goalStructureDefinition)),
  http.get(`*${BASE}/StructureDefinition/Task`, () => okJson(taskStructureDefinition)),

  // ValueSets
  http.get(`*${BASE}/ValueSet/$expand`, ({ request }) => {
    const url = new URL(request.url).searchParams.get("url");
    if (url === goalStatusValueSet.url) return okJson(goalStatusValueSet);
    if (url === taskStatusValueSet.url) return okJson(taskStatusValueSet);
    return okJson({ resourceType: "OperationOutcome" }, { status: 404 });
  }),

  // Patient
  http.get(`*${BASE}/Patient/:id`, ({ params }) => {
    if (params.id === patientFixture.id) return okJson(patientFixture);
    return okJson(
      { resourceType: "OperationOutcome", issue: [{ severity: "error", code: "not-found" }] },
      { status: 404 },
    );
  }),
  http.get(`*${BASE}/Patient`, ({ request }) => {
    const name = new URL(request.url).searchParams.get("name")?.toLowerCase();
    if (!name) return okJson(searchBundle([patientFixture]));
    const family = patientFixture.name?.[0]?.family?.toLowerCase() ?? "";
    const given = patientFixture.name?.[0]?.given?.[0]?.toLowerCase() ?? "";
    return okJson(
      searchBundle(family.includes(name) || given.includes(name) ? [patientFixture] : []),
    );
  }),

  // Goal search/CRUD
  http.get(`*${BASE}/Goal`, ({ request }) => {
    const qp = new URL(request.url).searchParams;
    const patient = qp.get("patient") ?? qp.get("subject");
    const status = qp.get("lifecycle-status");
    const all = Array.from(store.goals.values());
    const filtered = all.filter((g) => {
      if (patient) {
        const ref = g.subject?.reference ?? "";
        const matches = ref === patient || ref === `Patient/${patient}`;
        if (!matches) return false;
      }
      if (status && g.lifecycleStatus !== status) return false;
      return true;
    });
    return okJson(searchBundle(filtered));
  }),

  http.get(`*${BASE}/Goal/:id`, ({ params }) => {
    const g = store.goals.get(String(params.id));
    if (!g) return okJson({ resourceType: "OperationOutcome" }, { status: 404 });
    return okJson(g);
  }),

  http.post(`*${BASE}/Goal`, async ({ request }) => {
    const body = (await request.json()) as Goal;
    const id = body.id ?? nextId("goal");
    const created: Goal = { ...body, id, meta: { versionId: "1", lastUpdated: new Date().toISOString() } };
    store.goals.set(id, created);
    return okJson(created, { status: 201 });
  }),

  http.put(`*${BASE}/Goal/:id`, async ({ params, request }) => {
    const id = String(params.id);
    const body = (await request.json()) as Goal;
    const prev = store.goals.get(id);
    const versionId = String(Number(prev?.meta?.versionId ?? "0") + 1);
    const updated: Goal = { ...body, id, meta: { versionId, lastUpdated: new Date().toISOString() } };
    store.goals.set(id, updated);
    return okJson(updated);
  }),

  http.delete(`*${BASE}/Goal/:id`, ({ params }) => {
    store.goals.delete(String(params.id));
    return new HttpResponse(null, { status: 204 });
  }),

  // Task search/CRUD
  http.get(`*${BASE}/Task`, ({ request }) => {
    const qp = new URL(request.url).searchParams;
    const patient = qp.get("patient") ?? qp.get("subject");
    const focus = qp.get("focus");
    const status = qp.get("status");
    const all = Array.from(store.tasks.values());
    const filtered = all.filter((t) => {
      if (patient) {
        const ref = t.for?.reference ?? "";
        if (ref !== patient && ref !== `Patient/${patient}`) return false;
      }
      if (focus) {
        const ref = t.focus?.reference ?? "";
        if (ref !== focus && !ref.endsWith(`/${focus}`)) return false;
      }
      if (status && t.status !== status) return false;
      return true;
    });
    return okJson(searchBundle(filtered));
  }),

  http.get(`*${BASE}/Task/:id`, ({ params }) => {
    const t = store.tasks.get(String(params.id));
    if (!t) return okJson({ resourceType: "OperationOutcome" }, { status: 404 });
    return okJson(t);
  }),

  http.post(`*${BASE}/Task`, async ({ request }) => {
    const body = (await request.json()) as Task;
    const id = body.id ?? nextId("task");
    const created: Task = {
      ...body,
      id,
      meta: { versionId: "1", lastUpdated: new Date().toISOString() },
    };
    store.tasks.set(id, created);
    return okJson(created, { status: 201 });
  }),

  http.put(`*${BASE}/Task/:id`, async ({ params, request }) => {
    const id = String(params.id);
    const body = (await request.json()) as Task;
    const prev = store.tasks.get(id);
    const versionId = String(Number(prev?.meta?.versionId ?? "0") + 1);
    const updated: Task = {
      ...body,
      id,
      meta: { versionId, lastUpdated: new Date().toISOString() },
    };
    store.tasks.set(id, updated);
    return okJson(updated);
  }),

  http.delete(`*${BASE}/Task/:id`, ({ params }) => {
    store.tasks.delete(String(params.id));
    return new HttpResponse(null, { status: 204 });
  }),
];
