import type {
  Bundle,
  CapabilityStatement,
  OperationOutcome,
  Reference,
  Resource,
} from "fhir/r4";

export type SearchParamValue = string | number | boolean | Date;

export type SearchParams = Record<
  string,
  SearchParamValue | SearchParamValue[] | undefined
>;

export type JsonPatchOp =
  | { op: "add" | "replace" | "test"; path: string; value: unknown }
  | { op: "remove"; path: string }
  | { op: "move" | "copy"; from: string; path: string };

export interface RequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Sends If-Match: W/"<etag>" for optimistic concurrency on update/delete. */
  ifMatch?: string;
  /** Sends If-None-Match on read (returns 304 when unchanged). */
  ifNoneMatch?: string;
  /** Conditional create header (If-None-Exist). */
  ifNoneExist?: string;
  cache?: RequestCache;
}

export type FhirVersion = "4.0" | "4.3" | "5.0";

export interface FhirClient {
  readonly baseUrl: string;
  readonly fhirVersion: FhirVersion;

  capabilities(options?: RequestOptions): Promise<CapabilityStatement>;

  read<T extends Resource = Resource>(
    type: string,
    id: string,
    options?: RequestOptions,
  ): Promise<T>;

  vread<T extends Resource = Resource>(
    type: string,
    id: string,
    versionId: string,
    options?: RequestOptions,
  ): Promise<T>;

  history<T extends Resource = Resource>(
    type: string,
    id?: string,
    options?: RequestOptions,
  ): Promise<Bundle<T>>;

  search<T extends Resource = Resource>(
    type: string,
    params?: SearchParams,
    options?: RequestOptions,
  ): Promise<Bundle<T>>;

  create<T extends Resource>(
    resource: T,
    options?: RequestOptions,
  ): Promise<T>;

  update<T extends Resource>(
    resource: T & { id: string },
    options?: RequestOptions,
  ): Promise<T>;

  patch<T extends Resource = Resource>(
    type: string,
    id: string,
    operations: JsonPatchOp[],
    options?: RequestOptions,
  ): Promise<T>;

  delete(
    type: string,
    id: string,
    options?: RequestOptions,
  ): Promise<void>;

  readReference<T extends Resource = Resource>(
    reference: Reference,
    options?: RequestOptions,
  ): Promise<T>;

  /** Escape hatch for operations ($everything, $validate, etc.). */
  request<T = unknown>(init: {
    path: string;
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  }): Promise<T>;
}

export class FhirError extends Error {
  readonly status: number;
  readonly operationOutcome: OperationOutcome | undefined;
  readonly url: string;

  constructor(
    message: string,
    init: {
      status: number;
      url: string;
      operationOutcome?: OperationOutcome;
    },
  ) {
    super(message);
    this.name = "FhirError";
    this.status = init.status;
    this.url = init.url;
    this.operationOutcome = init.operationOutcome;
  }
}
