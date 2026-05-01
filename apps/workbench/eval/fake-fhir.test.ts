import { describe, expect, it } from "vitest";
import { buildFakeFhirFetch } from "./fake-fhir.js";
import type { FhirResource } from "./types.js";

const BASE = "https://eval.fhir.local/baseR4";
const PATIENT_ID = "pat-date-1";

const PATIENT_REF = `Patient/${PATIENT_ID}`;

const PATIENT: FhirResource = {
  resourceType: "Patient",
  id: PATIENT_ID,
  gender: "male",
};

function obs(id: string, dateIso: string): FhirResource {
  return {
    resourceType: "Observation",
    id,
    status: "final",
    subject: { reference: PATIENT_REF },
    category: [
      {
        coding: [
          {
            system:
              "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "laboratory",
          },
        ],
      },
    ],
    effectiveDateTime: dateIso,
  };
}

function enc(id: string, startIso: string): FhirResource {
  return {
    resourceType: "Encounter",
    id,
    status: "finished",
    subject: { reference: PATIENT_REF },
    period: { start: startIso },
  };
}

async function get(
  fetchFn: typeof fetch,
  path: string,
): Promise<{ status: number; body: unknown }> {
  const res = await fetchFn(`${BASE}${path}`);
  return { status: res.status, body: await res.json() };
}

describe("buildFakeFhirFetch — date filtering", () => {
  const bundle: FhirResource[] = [
    PATIENT,
    obs("o-old", "2024-01-15"),
    obs("o-mid", "2025-06-01"),
    obs("o-new", "2026-04-20"),
  ];
  const f = buildFakeFhirFetch({
    baseUrl: BASE,
    patientId: PATIENT_ID,
    bundle,
  });

  it("returns every observation when no date filter is supplied", async () => {
    const r = await get(
      f,
      `/Observation?patient=${encodeURIComponent(PATIENT_REF)}&_count=20`,
    );
    expect(r.status).toBe(200);
    const ids = (r.body as { entry?: Array<{ resource: { id: string } }> })
      .entry?.map((e) => e.resource.id);
    expect(ids).toEqual(["o-old", "o-mid", "o-new"]);
  });

  it("honours date=ge<YYYY-MM-DD>", async () => {
    const r = await get(
      f,
      `/Observation?patient=${encodeURIComponent(PATIENT_REF)}&date=ge2025-01-01&_count=20`,
    );
    const ids = (r.body as { entry?: Array<{ resource: { id: string } }> })
      .entry?.map((e) => e.resource.id);
    expect(ids).toEqual(["o-mid", "o-new"]);
  });

  it("honours date=le<YYYY-MM-DD>", async () => {
    const r = await get(
      f,
      `/Observation?patient=${encodeURIComponent(PATIENT_REF)}&date=le2025-12-31&_count=20`,
    );
    const ids = (r.body as { entry?: Array<{ resource: { id: string } }> })
      .entry?.map((e) => e.resource.id);
    expect(ids).toEqual(["o-old", "o-mid"]);
  });

  it("honours both ge and le bounds together (range)", async () => {
    const r = await get(
      f,
      `/Observation?patient=${encodeURIComponent(PATIENT_REF)}` +
        `&date=ge2025-01-01&date=le2025-12-31&_count=20`,
    );
    const ids = (r.body as { entry?: Array<{ resource: { id: string } }> })
      .entry?.map((e) => e.resource.id);
    expect(ids).toEqual(["o-mid"]);
  });

  it("honours date filters on Encounter via period.start", async () => {
    const encBundle: FhirResource[] = [
      PATIENT,
      enc("e-2024", "2024-03-01"),
      enc("e-2026", "2026-02-15"),
    ];
    const fEnc = buildFakeFhirFetch({
      baseUrl: BASE,
      patientId: PATIENT_ID,
      bundle: encBundle,
    });
    const r = await get(
      fEnc,
      `/Encounter?patient=${encodeURIComponent(PATIENT_REF)}&date=ge2025-01-01&_count=20`,
    );
    const ids = (r.body as { entry?: Array<{ resource: { id: string } }> })
      .entry?.map((e) => e.resource.id);
    expect(ids).toEqual(["e-2026"]);
  });

  it("filters out resources whose date field is missing when a range is set", async () => {
    const mixed: FhirResource[] = [
      PATIENT,
      { ...obs("o-no-date", "1970-01-01"), effectiveDateTime: undefined } as FhirResource,
      obs("o-2026", "2026-01-01"),
    ];
    const fMix = buildFakeFhirFetch({
      baseUrl: BASE,
      patientId: PATIENT_ID,
      bundle: mixed,
    });
    const r = await get(
      fMix,
      `/Observation?patient=${encodeURIComponent(PATIENT_REF)}&date=ge2025-01-01&_count=20`,
    );
    const ids = (r.body as { entry?: Array<{ resource: { id: string } }> })
      .entry?.map((e) => e.resource.id);
    expect(ids).toEqual(["o-2026"]);
  });
});

describe("buildFakeFhirFetch — patient-scope guard", () => {
  it("returns an empty bundle when the patient= param targets a different patient", async () => {
    const f = buildFakeFhirFetch({
      baseUrl: BASE,
      patientId: PATIENT_ID,
      bundle: [PATIENT, obs("o1", "2026-01-01")],
    });
    const r = await get(
      f,
      `/Observation?patient=${encodeURIComponent("Patient/other")}&_count=20`,
    );
    const total = (r.body as { total?: number }).total;
    expect(total).toBe(0);
  });
});
