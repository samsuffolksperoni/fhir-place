import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ElementDefinition } from "fhir/r4";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { FetchFhirClient } from "../../client/FetchFhirClient.js";
import { FhirClientProvider } from "../../hooks/FhirClientProvider.js";
import { defaultTypeInputs } from "./index.js";

const BASE = "https://fhir.example.test/fhir";
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mkWrapper = () => {
  const client = new FetchFhirClient({ baseUrl: BASE });
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <FhirClientProvider client={client}>{children}</FhirClientProvider>
    </QueryClientProvider>
  );
};

const CodeInput = defaultTypeInputs.code!;

describe("CodeInput (ValueSet-driven)", () => {
  const genderElement: ElementDefinition = {
    path: "Patient.gender",
    type: [{ code: "code" }],
    short: "male | female | other | unknown",
    binding: {
      strength: "required",
      valueSet: "http://hl7.org/fhir/ValueSet/administrative-gender",
    },
  };

  const mockValueSet = (codes: Array<{ code: string; display?: string }>) => {
    server.use(
      http.get(`${BASE}/ValueSet/$expand`, () =>
        HttpResponse.json({
          resourceType: "ValueSet",
          status: "active",
          url: "http://hl7.org/fhir/ValueSet/administrative-gender",
          expansion: {
            identifier: "x",
            timestamp: "2024-01-01T00:00:00Z",
            contains: codes.map((c) => ({
              system: "http://hl7.org/fhir/administrative-gender",
              ...c,
            })),
          },
        }),
      ),
    );
  };

  it("resolves binding.valueSet into a <select> of enumerated codes with display labels", async () => {
    mockValueSet([
      { code: "male", display: "Male" },
      { code: "female", display: "Female" },
      { code: "other", display: "Other" },
      { code: "unknown", display: "Unknown" },
    ]);
    const onChange = vi.fn();
    render(
      <CodeInput
        value={undefined}
        onChange={onChange}
        context={{ path: "Patient.gender", typeCode: "code", element: genderElement }}
      />,
      { wrapper: mkWrapper() },
    );

    await waitFor(() =>
      expect(screen.getByRole("option", { name: /Female \(female\)/ })).toBeInTheDocument(),
    );
    const select = screen.getByRole("combobox", { name: "gender" });
    await userEvent.selectOptions(select, "female");
    expect(onChange).toHaveBeenCalledWith("female");
  });

  it("required binding → no 'Other…' escape hatch", async () => {
    mockValueSet([{ code: "male" }, { code: "female" }]);
    render(
      <CodeInput
        value={undefined}
        onChange={() => {}}
        context={{ path: "Patient.gender", typeCode: "code", element: genderElement }}
      />,
      { wrapper: mkWrapper() },
    );
    await waitFor(() =>
      expect(screen.getByRole("option", { name: /female/ })).toBeInTheDocument(),
    );
    expect(screen.queryByRole("option", { name: /other…/i })).not.toBeInTheDocument();
  });

  it("extensible binding → shows an 'Other…' option", async () => {
    mockValueSet([{ code: "yes" }, { code: "no" }]);
    const extensibleEl: ElementDefinition = {
      ...genderElement,
      binding: {
        strength: "extensible",
        valueSet: "http://hl7.org/fhir/ValueSet/administrative-gender",
      },
    };
    render(
      <CodeInput
        value={undefined}
        onChange={() => {}}
        context={{ path: "Patient.gender", typeCode: "code", element: extensibleEl }}
      />,
      { wrapper: mkWrapper() },
    );
    await waitFor(() =>
      expect(screen.getByRole("option", { name: /other…/i })).toBeInTheDocument(),
    );
  });

  it("falls back to pipe-separated short when there is no binding", async () => {
    const noBinding: ElementDefinition = {
      path: "Fake.status",
      type: [{ code: "code" }],
      short: "draft | active | retired",
    };
    render(
      <CodeInput
        value={undefined}
        onChange={() => {}}
        context={{ path: "Fake.status", typeCode: "code", element: noBinding }}
      />,
      { wrapper: mkWrapper() },
    );
    expect(screen.getByRole("option", { name: "draft" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "active" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "retired" })).toBeInTheDocument();
  });

  it("falls back to a plain text input when there is neither binding nor short enumeration", () => {
    const bare: ElementDefinition = {
      path: "Fake.token",
      type: [{ code: "code" }],
    };
    render(
      <CodeInput
        value="xyz"
        onChange={() => {}}
        context={{ path: "Fake.token", typeCode: "code", element: bare }}
      />,
      { wrapper: mkWrapper() },
    );
    expect(screen.getByRole("textbox")).toHaveValue("xyz");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("preserves a current non-enumerated value by selecting 'Other…' and showing a free-text input (extensible)", async () => {
    mockValueSet([{ code: "draft" }, { code: "active" }]);
    const el: ElementDefinition = {
      ...genderElement,
      binding: {
        strength: "preferred",
        valueSet: "http://hl7.org/fhir/ValueSet/administrative-gender",
      },
    };
    render(
      <CodeInput
        value="custom-code"
        onChange={() => {}}
        context={{ path: "Fake.status", typeCode: "code", element: el }}
      />,
      { wrapper: mkWrapper() },
    );
    await waitFor(() => expect(screen.getByDisplayValue("custom-code")).toBeInTheDocument());
  });
});
