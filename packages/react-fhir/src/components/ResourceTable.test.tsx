import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Patient, StructureDefinition } from "fhir/r4";
import { describe, expect, it, vi } from "vitest";
import { FetchFhirClient } from "../client/FetchFhirClient.js";
import { FhirClientProvider } from "../hooks/FhirClientProvider.js";
import { getByPath, ResourceTable } from "./ResourceTable.js";

const wrap = () => {
  const client = new FetchFhirClient({ baseUrl: "https://fhir.example.test/fhir" });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <FhirClientProvider client={client}>{children}</FhirClientProvider>
    </QueryClientProvider>
  );
};

const sd: StructureDefinition = {
  resourceType: "StructureDefinition",
  id: "Patient",
  url: "http://hl7.org/fhir/StructureDefinition/Patient",
  name: "Patient",
  status: "active",
  kind: "resource",
  abstract: false,
  type: "Patient",
  snapshot: {
    element: [
      { id: "Patient", path: "Patient", min: 0, max: "*" },
      { id: "Patient.name", path: "Patient.name", min: 0, max: "*", short: "Name", type: [{ code: "HumanName" }] },
      { id: "Patient.gender", path: "Patient.gender", min: 0, max: "1", short: "Gender", type: [{ code: "code" }] },
      { id: "Patient.birthDate", path: "Patient.birthDate", min: 0, max: "1", short: "Birth date", type: [{ code: "date" }] },
    ],
  },
};

const patients: Patient[] = [
  {
    resourceType: "Patient",
    id: "p1",
    name: [{ given: ["Ada"], family: "Lovelace" }],
    gender: "female",
    birthDate: "1815-12-10",
  },
  {
    resourceType: "Patient",
    id: "p2",
    name: [{ given: ["Alan"], family: "Turing" }],
    gender: "male",
    birthDate: "1912-06-23",
  },
];

describe("getByPath", () => {
  it("reads nested string paths", () => {
    expect(getByPath({ a: { b: { c: 42 } } }, "a.b.c")).toBe(42);
  });

  it("auto-indexes the first element of arrays", () => {
    expect(
      getByPath({ name: [{ family: "Smith" }, { family: "Jones" }] }, "name.family"),
    ).toBe("Smith");
  });

  it("supports explicit [idx] segments", () => {
    expect(
      getByPath({ name: [{ family: "Smith" }, { family: "Jones" }] }, "name[1].family"),
    ).toBe("Jones");
  });

  it("returns undefined for missing segments", () => {
    expect(getByPath({ a: 1 }, "a.b.c")).toBeUndefined();
  });
});

describe("ResourceTable", () => {
  it("renders a header + row per resource with datatype-aware cells", () => {
    render(
      <ResourceTable<Patient>
        resources={patients}
        columns={["name", "gender", "birthDate"]}
        structureDefinition={sd}
      />,
      { wrapper: wrap() },
    );
    // Headers derived from SD.short
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Gender")).toBeInTheDocument();
    expect(screen.getByText("Birth date")).toBeInTheDocument();
    // Rows rendered
    const rows = screen.getAllByTestId("resource-row");
    expect(rows).toHaveLength(2);
    // HumanName cell uses the type renderer
    expect(within(rows[0]!).getByText(/Ada Lovelace/)).toBeInTheDocument();
  });

  it("supports custom cellRenderers per path", () => {
    render(
      <ResourceTable<Patient>
        resources={patients}
        columns={["name"]}
        cellRenderers={{
          name: (p) => <span data-testid="custom-name">{p.id}</span>,
        }}
        structureDefinition={sd}
      />,
      { wrapper: wrap() },
    );
    expect(screen.getAllByTestId("custom-name")).toHaveLength(2);
  });

  it("invokes onRowClick when a row is clicked", async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    render(
      <ResourceTable<Patient>
        resources={patients}
        columns={["name"]}
        onRowClick={onRowClick}
        structureDefinition={sd}
      />,
      { wrapper: wrap() },
    );
    await user.click(screen.getAllByTestId("resource-row")[0]!);
    expect(onRowClick).toHaveBeenCalledWith(patients[0]);
  });

  it("toggles sort direction via header click (controlled)", async () => {
    const onSortChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ResourceTable<Patient>
        resources={patients}
        columns={["gender"]}
        sort={{ by: "gender", direction: "asc" }}
        onSortChange={onSortChange}
        structureDefinition={sd}
      />,
      { wrapper: wrap() },
    );
    await user.click(screen.getByRole("button", { name: /gender/i }));
    expect(onSortChange).toHaveBeenCalledWith({ by: "gender", direction: "desc" });
  });

  it("renders emptyState when resources is empty", () => {
    render(
      <ResourceTable<Patient>
        resources={[]}
        columns={["gender"]}
        emptyState={<p data-testid="empty">Nothing here</p>}
        structureDefinition={sd}
      />,
      { wrapper: wrap() },
    );
    expect(screen.getByTestId("empty")).toBeInTheDocument();
  });

  it("falls back to a friendly dash for missing cell values", () => {
    const partial: Patient = { resourceType: "Patient", id: "p3", gender: "other" };
    render(
      <ResourceTable<Patient>
        resources={[partial]}
        columns={["name", "gender"]}
        structureDefinition={sd}
      />,
      { wrapper: wrap() },
    );
    const row = screen.getByTestId("resource-row");
    // Name missing → em-dash placeholder
    expect(within(row).getByText("—")).toBeInTheDocument();
    // Gender present → renders via code renderer
    expect(within(row).getByText("other")).toBeInTheDocument();
  });
});
