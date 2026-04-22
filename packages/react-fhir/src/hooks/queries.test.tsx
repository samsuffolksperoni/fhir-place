import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { Patient } from "fhir/r4";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { FetchFhirClient } from "../client/FetchFhirClient.js";
import { FhirClientProvider } from "./FhirClientProvider.js";
import {
  useCapabilities,
  useCreateResource,
  useDeleteResource,
  useResource,
  useSearch,
  useStructureDefinition,
  useUpdateResource,
} from "./queries.js";

const BASE = "https://fhir.example.test/fhir";
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mkWrapper = () => {
  const client = new FetchFhirClient({ baseUrl: BASE });
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <FhirClientProvider client={client}>{children}</FhirClientProvider>
    </QueryClientProvider>
  );
  return { wrapper, qc, client };
};

describe("query hooks", () => {
  it("useCapabilities fetches /metadata", async () => {
    server.use(
      http.get(`${BASE}/metadata`, () =>
        HttpResponse.json({ resourceType: "CapabilityStatement", status: "active" }),
      ),
    );
    const { wrapper } = mkWrapper();
    const { result } = renderHook(() => useCapabilities(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.resourceType).toBe("CapabilityStatement");
  });

  it("useResource is disabled when id is undefined", () => {
    const { wrapper } = mkWrapper();
    const { result } = renderHook(() => useResource<Patient>("Patient", undefined), {
      wrapper,
    });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("useResource fetches when id is provided", async () => {
    server.use(
      http.get(`${BASE}/Patient/42`, () =>
        HttpResponse.json({ resourceType: "Patient", id: "42", gender: "other" }),
      ),
    );
    const { wrapper } = mkWrapper();
    const { result } = renderHook(() => useResource<Patient>("Patient", "42"), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe("42");
  });

  it("useSearch passes params to the server", async () => {
    let captured: URLSearchParams | null = null;
    server.use(
      http.get(`${BASE}/Patient`, ({ request }) => {
        captured = new URL(request.url).searchParams;
        return HttpResponse.json({
          resourceType: "Bundle",
          type: "searchset",
          total: 0,
          entry: [],
        });
      }),
    );
    const { wrapper } = mkWrapper();
    const { result } = renderHook(
      () => useSearch<Patient>("Patient", { name: "adams", _count: 5 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(captured!.get("name")).toBe("adams");
    expect(captured!.get("_count")).toBe("5");
  });

  it("useStructureDefinition reads the definition resource", async () => {
    server.use(
      http.get(`${BASE}/StructureDefinition/Patient`, () =>
        HttpResponse.json({
          resourceType: "StructureDefinition",
          id: "Patient",
          url: "http://hl7.org/fhir/StructureDefinition/Patient",
          name: "Patient",
          status: "active",
          kind: "resource",
          abstract: false,
          type: "Patient",
        }),
      ),
    );
    const { wrapper } = mkWrapper();
    const { result } = renderHook(() => useStructureDefinition("Patient"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe("Patient");
  });

  it("useCreateResource POSTs and invalidates caches", async () => {
    const writes = vi.fn();
    server.use(
      http.post(`${BASE}/Patient`, async ({ request }) => {
        writes(await request.json());
        return HttpResponse.json({ resourceType: "Patient", id: "new-id" }, { status: 201 });
      }),
    );
    const { wrapper, qc } = mkWrapper();
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useCreateResource<Patient>(), { wrapper });
    let created: Patient | undefined;
    await act(async () => {
      created = await result.current.mutateAsync({
        resourceType: "Patient",
        gender: "male",
      });
    });
    expect(writes).toHaveBeenCalled();
    expect(created?.id).toBe("new-id");
    expect(invalidate).toHaveBeenCalled();
  });

  it("useUpdateResource PUTs by id", async () => {
    server.use(
      http.put(`${BASE}/Patient/7`, async ({ request }) => {
        const body = (await request.json()) as Patient;
        return HttpResponse.json({ ...body, meta: { versionId: "2" } });
      }),
    );
    const { wrapper } = mkWrapper();
    const { result } = renderHook(() => useUpdateResource<Patient>(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        resourceType: "Patient",
        id: "7",
        gender: "female",
      });
    });
    expect(result.current.data?.meta?.versionId).toBe("2");
  });

  it("useDeleteResource DELETEs by type and id", async () => {
    const hit = vi.fn();
    server.use(
      http.delete(`${BASE}/Patient/9`, () => {
        hit();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { wrapper } = mkWrapper();
    const { result } = renderHook(() => useDeleteResource(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ type: "Patient", id: "9" });
    });
    expect(hit).toHaveBeenCalledOnce();
    expect(result.current.isSuccess).toBe(true);
  });

  it("throws when useFhirClient is used without provider", async () => {
    const { renderHook: rh } = await import("@testing-library/react");
    const qc = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    expect(() =>
      rh(() => useResource("Patient", "1"), { wrapper }),
    ).toThrow(/FhirClientProvider/);
  });
});
