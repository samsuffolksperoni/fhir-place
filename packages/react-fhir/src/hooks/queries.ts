import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type {
  Bundle,
  CapabilityStatement,
  Reference,
  Resource,
  StructureDefinition,
} from "fhir/r4";
import type { FhirClient, SearchParams } from "../client/types.js";
import { resolveStructureDefinition } from "../structure/resolve.js";
import { useFhirClient } from "./FhirClientProvider.js";

/** Stable query keys so callers can target them with invalidate/refetch. */
export const fhirQueryKeys = {
  all: (baseUrl: string) => ["fhir", baseUrl] as const,
  capabilities: (baseUrl: string) => [...fhirQueryKeys.all(baseUrl), "metadata"] as const,
  resource: (baseUrl: string, type: string, id: string) =>
    [...fhirQueryKeys.all(baseUrl), type, id] as const,
  search: (baseUrl: string, type: string, params?: SearchParams) =>
    [...fhirQueryKeys.all(baseUrl), type, "search", params ?? {}] as const,
  structure: (baseUrl: string, type: string) =>
    [...fhirQueryKeys.all(baseUrl), "StructureDefinition", type] as const,
  reference: (baseUrl: string, ref: string) =>
    [...fhirQueryKeys.all(baseUrl), "ref", ref] as const,
};

type ReadQueryOpts<T> = Omit<
  UseQueryOptions<T, Error, T, readonly unknown[]>,
  "queryKey" | "queryFn"
>;

export function useCapabilities(options?: ReadQueryOpts<CapabilityStatement>) {
  const client = useFhirClient();
  return useQuery({
    queryKey: fhirQueryKeys.capabilities(client.baseUrl),
    queryFn: ({ signal }) => client.capabilities({ signal }),
    staleTime: 5 * 60_000,
    ...options,
  });
}

export function useResource<T extends Resource = Resource>(
  type: string,
  id: string | undefined,
  options?: ReadQueryOpts<T>,
) {
  const client = useFhirClient();
  return useQuery({
    queryKey: fhirQueryKeys.resource(client.baseUrl, type, id ?? ""),
    queryFn: ({ signal }) => client.read<T>(type, id!, { signal }),
    enabled: Boolean(id),
    ...options,
  });
}

export function useSearch<T extends Resource = Resource>(
  type: string,
  params?: SearchParams,
  options?: ReadQueryOpts<Bundle<T>>,
) {
  const client = useFhirClient();
  return useQuery({
    queryKey: fhirQueryKeys.search(client.baseUrl, type, params),
    queryFn: ({ signal }) => client.search<T>(type, params, { signal }),
    ...options,
  });
}

export function useStructureDefinition(
  type: string,
  options?: ReadQueryOpts<StructureDefinition>,
) {
  const client = useFhirClient();
  return useQuery({
    queryKey: fhirQueryKeys.structure(client.baseUrl, type),
    queryFn: ({ signal }) => resolveStructureDefinition(client, type, { signal }),
    staleTime: 60 * 60_000,
    ...options,
  });
}

export function useReadReference<T extends Resource = Resource>(
  reference: Reference | undefined,
  options?: ReadQueryOpts<T>,
) {
  const client = useFhirClient();
  const refKey = reference?.reference ?? "";
  return useQuery({
    queryKey: fhirQueryKeys.reference(client.baseUrl, refKey),
    queryFn: ({ signal }) => client.readReference<T>(reference!, { signal }),
    enabled: Boolean(reference?.reference),
    ...options,
  });
}

/** Invalidates cached reads for a specific resource (e.g. after a mutation). */
const invalidateResource = (qc: ReturnType<typeof useQueryClient>, client: FhirClient, type: string, id?: string) => {
  if (id) {
    qc.invalidateQueries({ queryKey: fhirQueryKeys.resource(client.baseUrl, type, id) });
  }
  qc.invalidateQueries({ queryKey: [...fhirQueryKeys.all(client.baseUrl), type] });
};

export function useCreateResource<T extends Resource>(
  options?: UseMutationOptions<T, Error, T>,
) {
  const client = useFhirClient();
  const qc = useQueryClient();
  return useMutation<T, Error, T>({
    mutationFn: (resource) => client.create<T>(resource),
    onSuccess: (data, _vars, _ctx) => {
      invalidateResource(qc, client, data.resourceType, data.id);
    },
    ...options,
  });
}

export function useUpdateResource<T extends Resource>(
  options?: UseMutationOptions<T, Error, T & { id: string }>,
) {
  const client = useFhirClient();
  const qc = useQueryClient();
  return useMutation<T, Error, T & { id: string }>({
    mutationFn: (resource) => client.update<T>(resource),
    onSuccess: (data) => invalidateResource(qc, client, data.resourceType, data.id),
    ...options,
  });
}

export function useDeleteResource(
  options?: UseMutationOptions<void, Error, { type: string; id: string }>,
) {
  const client = useFhirClient();
  const qc = useQueryClient();
  return useMutation<void, Error, { type: string; id: string }>({
    mutationFn: ({ type, id }) => client.delete(type, id),
    onSuccess: (_data, vars) => invalidateResource(qc, client, vars.type, vars.id),
    ...options,
  });
}
