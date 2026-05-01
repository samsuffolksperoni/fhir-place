import { describe, expect, it, vi } from "vitest";

import { FhirMcpClient } from "./index";

describe("FhirMcpClient", () => {
  it("lists the two typed tools", () => {
    const client = new FhirMcpClient("https://example.test/fhir");
    expect(client.listTools().map((tool) => tool.name)).toEqual(["patient_summary", "read_resource"]);
  });

  it("enforces allowlisted resources", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const client = new FhirMcpClient("https://example.test/fhir", fetchMock);

    await expect(
      client.callTool("read_resource", {
        patientId: "p-1",
        resourceType: "DocumentReference"
      })
    ).rejects.toThrow("not allowlisted");
  });

  it("calls patient-scoped search endpoints", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({ resourceType: "Bundle", total: 1 })
    } as Response);

    const client = new FhirMcpClient("https://example.test/fhir/", fetchMock);
    await client.callTool("read_resource", {
      patientId: "p-1",
      resourceType: "Observation",
      count: 10
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/fhir/Observation?patient=p-1&_count=10",
      expect.objectContaining({ headers: expect.anything() })
    );
  });
});
