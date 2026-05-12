import type { StructureDefinition } from "fhir/r4";
import type { FhirClient } from "../client/types.js";
import { FhirError } from "../client/types.js";
import { coreStructureDefinition } from "./core/index.js";

export interface ResolveOptions {
  /** Optional profile canonical URL to resolve instead of the base type SD. */
  profile?: string | null;
  signal?: AbortSignal;
  /** Override the canonical URL derivation (defaults to `http://hl7.org/fhir/StructureDefinition/{type}`). */
  canonical?: string;
  /** When false, skip the bundled-core fallback (useful in tests). */
  useBundledFallback?: boolean;
}

const canonicalFor = (type: string) =>
  `http://hl7.org/fhir/StructureDefinition/${type}`;

/**
 * Resolves a StructureDefinition.
 *
 * For unprofiled core resource types we prefer the in-package bundled SD —
 * core SDs are stable per FHIR version and most servers (public HAPI, the
 * SMART sandboxes, Aidbox without a license) don't expose them at the REST
 * layer anyway, so trying the network first wastes round-trips on the common
 * path. Profiled requests still go to the server because profiles are
 * server-defined.
 *
 * Resolution order:
 *
 *   1. Bundled core SD (canonical is the base type's + a bundled copy ships) —
 *      zero network.
 *   2. Instance read at `StructureDefinition/{id}`.
 *   3. Search by canonical URL (`StructureDefinition?url=...`) — first hit.
 *   4. Bundled core SD for the base type — last-resort safety net for the
 *      cases step 1 skipped (a profile was requested, or the configured
 *      fetcher was unavailable on the first pass). Rendering against the base
 *      R4 schema beats a hard failure.
 *
 * Throws only when every step fails, with a message that names the type and
 * hints at the workaround (supplying an SD explicitly).
 */
export async function resolveStructureDefinition(
  client: FhirClient,
  type: string,
  options: ResolveOptions = {},
): Promise<StructureDefinition> {
  const signal = options.signal;
  const canonical = options.canonical ?? options.profile ?? canonicalFor(type);
  const canonicalType = canonicalFor(type);
  const useProfile = Boolean(options.profile);
  // The bundled-first shortcut applies whenever the canonical we're after is
  // the base type's — including when a "profile" was passed that just echoes
  // the base canonical (some servers stamp `meta.profile` with it). A real
  // profile canonical fails this check and goes to the server, as it must.
  const canUseBundled =
    options.useBundledFallback !== false && canonical === canonicalType;

  // 1. Bundled core SD (skip the server entirely for the common path).
  if (canUseBundled) {
    const bundled = await coreStructureDefinition(type, signal);
    if (bundled) return bundled;
  }

  // 2. Instance read. For profiled canonicals, attempt an ID read only when inferable.
  const readId = useProfile ? inferIdFromCanonical(canonical) : type;
  if (readId) {
    try {
      return await client.read<StructureDefinition>("StructureDefinition", readId, {
        signal,
      });
    } catch (err) {
      if (!shouldFallback(err)) throw err;
    }
  }

  // 3. Search by canonical URL.
  try {
    const bundle = await client.search<StructureDefinition>(
      "StructureDefinition",
      { url: canonical },
      { signal },
    );
    const hit = bundle.entry?.find(
      (e) => e.resource?.resourceType === "StructureDefinition",
    )?.resource;
    if (hit) return hit;
  } catch (err) {
    if (!shouldFallback(err)) throw err;
  }

  // 4. Last-resort: the bundled core SD for the base type. Unlike step 1 this
  // runs even when a profile/non-standard canonical was requested — the base
  // R4 schema is a far better outcome than a hard "could not resolve" error.
  if (options.useBundledFallback !== false && !canUseBundled) {
    const bundled = await coreStructureDefinition(type, signal);
    if (bundled) return bundled;
  }

  throw new Error(
    `Could not resolve StructureDefinition for "${type}". ` +
      `No bundled copy ships for this type, ` +
      `the server does not store it at /StructureDefinition/${type}, ` +
      `and it does not return one via ?url=${canonical}. ` +
      `Supply one explicitly via the structureDefinition prop.`,
  );
}

/**
 * We fall back on the response codes a server uses to say "I don't have this
 * resource / I don't support this query" — 400/404/405/410/501. Public HAPI
 * returns 400 for `StructureDefinition?url=...` because it doesn't index the
 * SD canonical, and that's the exact case where the bundled fallback should
 * kick in. Other errors (auth, network abort, 500) bubble up so callers can
 * surface the real problem instead of silently masking it with a bundled SD.
 */
function shouldFallback(err: unknown): boolean {
  if (err instanceof FhirError) {
    return [400, 404, 405, 410, 501].includes(err.status);
  }
  // Treat non-FhirError exceptions (TypeError, AbortError, etc.) as bubbling.
  return false;
}


function inferIdFromCanonical(canonical: string): string | null {
  try {
    const url = new URL(canonical);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts.at(-1) ?? null;
  } catch {
    return null;
  }
}
