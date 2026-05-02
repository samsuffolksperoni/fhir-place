import FHIR from "fhirclient";
import { useEffect, useState } from "react";
import type { ServerConfig } from "../config.js";
import { getSmartRedirectUri } from "../config.js";

// Module-scoped cache so each server ID resolves its Client only once per page load.
const clientCache = new Map<string, Awaited<ReturnType<typeof FHIR.oauth2.ready>>>();

/**
 * Trigger a SMART App Launch authorization redirect.
 *
 * @param server   The active ServerConfig (must have authMode === "smart" and smart block).
 * @param ehr      When launching from an EHR, pass the iss + launch params from the URL.
 */
export async function smartAuthorize(
  server: ServerConfig,
  ehr?: { iss: string; launch: string },
): Promise<void> {
  if (!server.smart) throw new Error("Server has no SMART configuration");
  const scope = [
    server.smart.scope,
    server.smart.offlineAccess ? "offline_access" : "",
  ]
    .filter(Boolean)
    .join(" ");

  await FHIR.oauth2.authorize({
    iss: ehr?.iss ?? server.baseUrl,
    launch: ehr?.launch,
    clientId: server.smart.clientId,
    scope,
    redirectUri: getSmartRedirectUri(),
    pkceMode: "required",
    completeInTarget: true,
  });
}

/**
 * Complete a SMART launch after the authorization redirect.
 * Resolves to the FHIR Client with tokens loaded and stored.
 */
export async function smartReady(
  serverId?: string,
): Promise<Awaited<ReturnType<typeof FHIR.oauth2.ready>>> {
  const client = await FHIR.oauth2.ready();
  if (serverId) clientCache.set(serverId, client);
  return client;
}

/**
 * Get the current access token for a SMART server.
 * Returns null if no session exists yet. Refreshes automatically when the
 * token is within 60 seconds of expiry.
 */
export async function getAccessToken(serverId: string): Promise<string | null> {
  const cached = clientCache.get(serverId);
  if (!cached) return null;

  // Refresh if token is about to expire (or already expired).
  const expiresAt: number = (cached.state as { expiresAt?: number }).expiresAt ?? 0;
  if (expiresAt && Date.now() / 1000 > expiresAt - 60) {
    try {
      await cached.refresh();
    } catch {
      // Refresh failed — return current token and let the request fail naturally.
    }
  }

  return (cached.state.tokenResponse?.access_token as string | undefined) ?? null;
}

/**
 * Resolve the SMART Client from cached state. Used internally by hooks.
 * Returns null when no active session exists for the given server.
 */
export function getCachedClient(
  serverId: string,
): Awaited<ReturnType<typeof FHIR.oauth2.ready>> | null {
  return clientCache.get(serverId) ?? null;
}

/**
 * Store a client in the module cache (used by RedirectPage after ready()).
 */
export function setCachedClient(
  serverId: string,
  client: Awaited<ReturnType<typeof FHIR.oauth2.ready>>,
): void {
  clientCache.set(serverId, client);
}

/**
 * Sign out by clearing the SMART session state from sessionStorage and the
 * in-memory cache.
 */
export function smartSignOut(serverId?: string): void {
  if (serverId) clientCache.delete(serverId);
  else clientCache.clear();
  // Clear all fhirclient session entries from sessionStorage.
  if (typeof window !== "undefined") {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith("SMART"))
      .forEach((k) => sessionStorage.removeItem(k));
  }
}

// ---------------------------------------------------------------------------
// React hooks
// ---------------------------------------------------------------------------

export interface SmartUser {
  fhirUser: string | null;
  patientId: string | null;
}

/**
 * Returns the FHIR user URL and bound patient ID from the current SMART session.
 * Both are null when there is no active session.
 */
export function useSmartUser(serverId: string): SmartUser {
  const [info, setInfo] = useState<SmartUser>({ fhirUser: null, patientId: null });

  useEffect(() => {
    const client = getCachedClient(serverId);
    if (!client) return;
    setInfo({
      fhirUser: client.getFhirUser() ?? null,
      patientId: client.getPatientId() ?? null,
    });
  }, [serverId]);

  return info;
}

/**
 * Returns true when there is a cached SMART session for the given server.
 */
export function useHasSmartSession(serverId: string): boolean {
  return getCachedClient(serverId) !== null;
}
