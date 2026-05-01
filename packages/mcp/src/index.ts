export type FhirToolName = "patient_summary" | "read_resource";

const ALLOWED_RESOURCES = new Set([
  "AllergyIntolerance",
  "Condition",
  "Encounter",
  "Immunization",
  "MedicationRequest",
  "Observation",
  "Patient",
  "Procedure"
]);

export type FhirToolDefinition = {
  name: FhirToolName;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type PatientSummaryInput = {
  patientId: string;
  resourceTypes?: string[];
  count?: number;
};

export type ReadResourceInput = {
  patientId: string;
  resourceType: string;
  resourceId?: string;
  count?: number;
};

const normalizeBase = (url: string): string => url.replace(/\/+$/, "");

const ensureAllowedResource = (resourceType: string): void => {
  if (!ALLOWED_RESOURCES.has(resourceType)) {
    throw new Error(`Resource type ${resourceType} is not allowlisted.`);
  }
};

const ensurePatientId = (patientId: string): void => {
  if (!patientId.trim()) {
    throw new Error("patientId is required.");
  }
};

export class FhirMcpClient {
  readonly baseUrl: string;

  constructor(baseUrl: string, private readonly fetchImpl: typeof fetch = fetch) {
    this.baseUrl = normalizeBase(baseUrl);
  }

  listTools(): FhirToolDefinition[] {
    return [
      {
        name: "patient_summary",
        description: "Return a patient-scoped bundle for core read-only summary resources.",
        inputSchema: {
          type: "object",
          required: ["patientId"],
          properties: {
            patientId: { type: "string", minLength: 1 },
            resourceTypes: { type: "array", items: { type: "string" } },
            count: { type: "number", minimum: 1, maximum: 100 }
          }
        }
      },
      {
        name: "read_resource",
        description: "Return a patient-scoped allowlisted resource read/search result.",
        inputSchema: {
          type: "object",
          required: ["patientId", "resourceType"],
          properties: {
            patientId: { type: "string", minLength: 1 },
            resourceType: { type: "string" },
            resourceId: { type: "string" },
            count: { type: "number", minimum: 1, maximum: 100 }
          }
        }
      }
    ];
  }

  async callTool(name: FhirToolName, input: PatientSummaryInput | ReadResourceInput): Promise<unknown> {
    if (name === "patient_summary") {
      return this.patientSummary(input as PatientSummaryInput);
    }

    return this.readResource(input as ReadResourceInput);
  }

  private async patientSummary(input: PatientSummaryInput): Promise<unknown> {
    ensurePatientId(input.patientId);
    const limit = input.count ?? 20;
    const resourceTypes = input.resourceTypes ?? [
      "Patient",
      "Condition",
      "AllergyIntolerance",
      "MedicationRequest",
      "Observation"
    ];

    for (const resourceType of resourceTypes) {
      ensureAllowedResource(resourceType);
    }

    const entries = await Promise.all(
      resourceTypes.map(async (resourceType) => ({
        resourceType,
        bundle: await this.fetchJson(
          `${this.baseUrl}/${resourceType}?patient=${encodeURIComponent(input.patientId)}&_count=${limit}`
        )
      }))
    );

    return {
      patientId: input.patientId,
      entries
    };
  }

  private async readResource(input: ReadResourceInput): Promise<unknown> {
    ensurePatientId(input.patientId);
    ensureAllowedResource(input.resourceType);

    if (input.resourceId) {
      const resource = await this.fetchJson(`${this.baseUrl}/${input.resourceType}/${encodeURIComponent(input.resourceId)}`);
      return { patientId: input.patientId, resource };
    }

    const limit = input.count ?? 20;
    const bundle = await this.fetchJson(
      `${this.baseUrl}/${input.resourceType}?patient=${encodeURIComponent(input.patientId)}&_count=${limit}`
    );

    return { patientId: input.patientId, bundle };
  }

  private async fetchJson(url: string): Promise<unknown> {
    const response = await this.fetchImpl(url, {
      headers: {
        Accept: "application/fhir+json, application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`FHIR request failed (${response.status}): ${url}`);
    }

    return response.json();
  }
}
