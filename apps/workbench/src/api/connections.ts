export type ConnectionKind = "fhir_clinical";
export type AuthType = "none" | "bearer";

export interface ConnectionRow {
  id: string;
  name: string;
  kind: ConnectionKind;
  baseUrl: string;
  authType: AuthType;
  hasAuthToken: boolean;
  createdAt: string;
  updatedAt: string;
  lastCapabilityAt: string | null;
  lastCapabilityStatus: "ok" | "error" | null;
  lastCapabilityFhirVersion: string | null;
  lastCapabilitySoftware: string | null;
  lastCapabilityJson: string | null;
  lastCapabilityError: string | null;
}

export interface CreateConnectionInput {
  name: string;
  kind: ConnectionKind;
  baseUrl: string;
  authType: AuthType;
  authToken?: string;
}

export type CapabilityProbeResult =
  | { ok: true; fhirVersion: string | null; software: string | null; raw: unknown }
  | { ok: false; error: string };

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = "";
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      detail = await res.text();
    }
    throw new Error(`${res.status} ${res.statusText}: ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function listConnections(): Promise<ConnectionRow[]> {
  const res = await fetch("/api/connections");
  const body = await handle<{ connections: ConnectionRow[] }>(res);
  return body.connections;
}

export async function getConnection(id: string): Promise<ConnectionRow> {
  const res = await fetch(`/api/connections/${encodeURIComponent(id)}`);
  const body = await handle<{ connection: ConnectionRow }>(res);
  return body.connection;
}

export async function createConnection(
  input: CreateConnectionInput,
): Promise<ConnectionRow> {
  const res = await fetch("/api/connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await handle<{ connection: ConnectionRow }>(res);
  return body.connection;
}

export async function testConnection(
  id: string,
): Promise<{ connection: ConnectionRow; capability: CapabilityProbeResult }> {
  const res = await fetch(`/api/connections/${encodeURIComponent(id)}/test`, {
    method: "POST",
  });
  return handle<{ connection: ConnectionRow; capability: CapabilityProbeResult }>(res);
}

export async function deleteConnection(id: string): Promise<void> {
  const res = await fetch(`/api/connections/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  await handle<void>(res);
}
