import { eq } from "drizzle-orm";
import { dataConnection, type DataConnection } from "../../db/schema.js";
import type { WorkbenchDb } from "../../db/client.js";
import type { CreateConnectionInput } from "../schemas.js";
import {
  probeCapabilityStatement,
  type CapabilityProbeResult,
} from "./fhir-connection.js";

export type ConnectionRow = Omit<DataConnection, "authToken"> & {
  hasAuthToken: boolean;
};

/**
 * The auth token never leaves the server. The frontend only sees whether one
 * is configured, never the token itself.
 */
function redact(row: DataConnection): ConnectionRow {
  const { authToken, ...rest } = row;
  return { ...rest, hasAuthToken: Boolean(authToken) };
}

export function createConnectionStore(
  db: WorkbenchDb,
  options: { generateId?: () => string; now?: () => string; fetchFn?: typeof fetch } = {},
) {
  const generateId = options.generateId ?? defaultId;
  const now = options.now ?? (() => new Date().toISOString());
  const fetchFn = options.fetchFn ?? fetch;

  return {
    list(): ConnectionRow[] {
      return db.select().from(dataConnection).all().map(redact);
    },

    get(id: string): ConnectionRow | null {
      const row = db.select().from(dataConnection).where(eq(dataConnection.id, id)).get();
      return row ? redact(row) : null;
    },

    create(input: CreateConnectionInput): ConnectionRow {
      const id = generateId();
      const ts = now();
      db.insert(dataConnection)
        .values({
          id,
          name: input.name,
          kind: input.kind,
          baseUrl: input.baseUrl,
          authType: input.authType,
          authToken: input.authType === "bearer" ? (input.authToken ?? null) : null,
          createdAt: ts,
          updatedAt: ts,
        })
        .run();
      const row = db.select().from(dataConnection).where(eq(dataConnection.id, id)).get();
      if (!row) throw new Error("connection insert failed");
      return redact(row);
    },

    delete(id: string): boolean {
      const result = db.delete(dataConnection).where(eq(dataConnection.id, id)).run();
      return result.changes > 0;
    },

    async test(id: string): Promise<{ row: ConnectionRow; result: CapabilityProbeResult } | null> {
      const row = db.select().from(dataConnection).where(eq(dataConnection.id, id)).get();
      if (!row) return null;

      const result = await probeCapabilityStatement(row, fetchFn);
      const ts = now();

      const updates: Partial<DataConnection> = {
        lastCapabilityAt: ts,
        updatedAt: ts,
      };
      if (result.ok) {
        updates.lastCapabilityStatus = "ok";
        updates.lastCapabilityFhirVersion = result.fhirVersion;
        updates.lastCapabilitySoftware = result.software;
        updates.lastCapabilityJson = JSON.stringify(result.raw);
        updates.lastCapabilityError = null;
      } else {
        updates.lastCapabilityStatus = "error";
        updates.lastCapabilityError = result.error;
      }

      db.update(dataConnection).set(updates).where(eq(dataConnection.id, id)).run();
      const updated = db.select().from(dataConnection).where(eq(dataConnection.id, id)).get();
      if (!updated) throw new Error("connection vanished after update");
      return { row: redact(updated), result };
    },
  };
}

export type ConnectionStore = ReturnType<typeof createConnectionStore>;

function defaultId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `conn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
