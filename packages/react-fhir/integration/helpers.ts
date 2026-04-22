import { FetchFhirClient } from "../src/client/FetchFhirClient.js";
import { FhirError } from "../src/client/types.js";

export const FHIR_BASE_URL =
  process.env.FHIR_BASE_URL ?? "https://hapi.fhir.org/baseR4";

/** Identifier system we use for every test resource, so we can find and clean up. */
export const TEST_IDENTIFIER_SYSTEM = "https://fhir-place.dev/test";

export const makeClient = () =>
  new FetchFhirClient({ baseUrl: FHIR_BASE_URL });

/**
 * Probes the target server with a short-timeout metadata call. When
 * `SKIP_IF_UNREACHABLE` is truthy and the probe fails, we return false so the
 * suite can `describe.skip` itself and avoid polluting CI with flakes caused
 * by HAPI being temporarily down.
 */
export async function serverReachable(): Promise<boolean> {
  if (process.env.SKIP_IF_UNREACHABLE === "0") return true;
  const client = makeClient();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    await client.capabilities({ signal: controller.signal });
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `[integration] ${FHIR_BASE_URL} is unreachable (${(err as Error).message}); skipping suite.`,
    );
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export const isFhirError = (err: unknown): err is FhirError =>
  err instanceof FhirError;
