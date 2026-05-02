import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ServerConfig } from "../config.js";

// ---------------------------------------------------------------------------
// Stub fhirclient before importing smartSession so the module-level import
// in smartSession.ts picks up the mock.
// ---------------------------------------------------------------------------
const mockAuthorize = vi.fn();
const mockReady = vi.fn();
const mockRefresh = vi.fn();

vi.mock("fhirclient", () => ({
  default: {
    oauth2: {
      authorize: mockAuthorize,
      ready: mockReady,
    },
  },
}));

// Import after mocking.
const {
  smartAuthorize,
  smartReady,
  getAccessToken,
  getCachedClient,
  setCachedClient,
  smartSignOut,
} = await import("./smartSession.js");

// CachedClient type — mirrors what fhirclient returns from oauth2.ready().
// We don't care about the full API in tests; only the properties we access.
type FakeClient = Parameters<typeof setCachedClient>[1];

const makeServer = (overrides: Partial<ServerConfig> = {}): ServerConfig => ({
  id: "test-server",
  label: "Test",
  baseUrl: "https://fhir.example.org",
  authMode: "smart",
  smart: { clientId: "app-id", scope: "openid fhirUser launch/patient patient/*.read" },
  ...overrides,
});

const makeFakeClient = (accessToken = "tok-abc", expiresAt?: number): FakeClient => ({
  state: {
    tokenResponse: { access_token: accessToken },
    ...(expiresAt !== undefined ? { expiresAt } : {}),
  },
  getFhirUser: () => "Practitioner/p1",
  getPatientId: () => "patient-42",
  refresh: mockRefresh,
} as unknown as FakeClient);

beforeEach(() => {
  vi.clearAllMocks();
  smartSignOut(); // clear module-level cache

  // Minimal sessionStorage stub.
  const store: Record<string, string> = {};
  const ss = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; },
  };
  vi.stubGlobal("sessionStorage", ss);
  vi.stubGlobal("window", {
    sessionStorage: ss,
    location: { origin: "http://localhost" },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("smartAuthorize", () => {
  it("calls FHIR.oauth2.authorize with pkceMode required", async () => {
    mockAuthorize.mockResolvedValue(undefined);
    const server = makeServer();
    await smartAuthorize(server);
    expect(mockAuthorize).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: "app-id",
        pkceMode: "required",
        completeInTarget: true,
      }),
    );
  });

  it("includes EHR launch params when provided", async () => {
    mockAuthorize.mockResolvedValue(undefined);
    const server = makeServer();
    await smartAuthorize(server, { iss: "https://ehr.example.org/fhir", launch: "xyz" });
    expect(mockAuthorize).toHaveBeenCalledWith(
      expect.objectContaining({
        iss: "https://ehr.example.org/fhir",
        launch: "xyz",
      }),
    );
  });

  it("appends offline_access when offlineAccess is true", async () => {
    mockAuthorize.mockResolvedValue(undefined);
    const server = makeServer({
      smart: { clientId: "app-id", scope: "openid", offlineAccess: true },
    });
    await smartAuthorize(server);
    const scope = (mockAuthorize.mock.calls[0] as [{ scope: string }])[0].scope;
    expect(scope).toContain("offline_access");
  });

  it("throws when server has no smart config", async () => {
    const server: ServerConfig = {
      id: "x",
      label: "x",
      baseUrl: "https://x",
      authMode: "smart",
    };
    await expect(smartAuthorize(server)).rejects.toThrow("no SMART configuration");
  });
});

describe("getAccessToken", () => {
  it("returns null when no session is cached", async () => {
    expect(await getAccessToken("test-server")).toBeNull();
  });

  it("returns token from cached client", async () => {
    const client = makeFakeClient("tok-123", Math.floor(Date.now() / 1000) + 3600);
    setCachedClient("test-server", client);
    expect(await getAccessToken("test-server")).toBe("tok-123");
  });

  it("calls client.refresh() when token is about to expire", async () => {
    const expiringSoon = Math.floor(Date.now() / 1000) + 30; // 30s left
    const client = makeFakeClient("old-tok", expiringSoon);
    mockRefresh.mockResolvedValue(undefined);
    setCachedClient("test-server", client);
    await getAccessToken("test-server");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("does not call refresh when token has plenty of time left", async () => {
    const farFuture = Math.floor(Date.now() / 1000) + 3600;
    const client = makeFakeClient("fresh-tok", farFuture);
    setCachedClient("test-server", client);
    await getAccessToken("test-server");
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});

describe("smartReady", () => {
  it("resolves the client and caches it", async () => {
    const fakeClient = makeFakeClient("ready-tok");
    mockReady.mockResolvedValue(fakeClient);
    const client = await smartReady("test-server");
    expect(client).toBe(fakeClient);
    expect(getCachedClient("test-server")).toBe(fakeClient);
  });
});

describe("smartSignOut", () => {
  it("removes a specific server from the cache", () => {
    const client = makeFakeClient();
    setCachedClient("test-server", client);
    smartSignOut("test-server");
    expect(getCachedClient("test-server")).toBeNull();
  });

  it("clears all servers when called without an id", () => {
    const client = makeFakeClient();
    setCachedClient("server-a", client);
    setCachedClient("server-b", client);
    smartSignOut();
    expect(getCachedClient("server-a")).toBeNull();
    expect(getCachedClient("server-b")).toBeNull();
  });
});
