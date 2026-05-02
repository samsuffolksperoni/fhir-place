import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ACTIVE_SERVER_CONFIG,
  DEFAULT_SMART_SCOPE,
  DEFAULT_TERMINOLOGY_BASE_URL,
  type AuthMode,
  type CustomHeader,
  type ServerConfig,
  getSmartLaunchUri,
  getSmartRedirectUri,
  loadActiveServerId,
  loadAnthropicApiKey,
  loadServers,
  loadStoredTerminologyBaseUrl,
  saveActiveServerId,
  saveAnthropicApiKey,
  saveServers,
  saveTerminologyBaseUrl,
} from "../../../config.js";
import { probeFhirServer } from "../../../serverProbe.js";
import {
  smartAuthorize,
  smartSignOut,
  useHasSmartSession,
  useSmartUser,
} from "../../../smart/smartSession.js";

type TestState =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "ok"; software?: string; fhirVersion?: string }
  | { status: "error"; message: string };

const newServerId = (): string =>
  `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const blankServer = (): ServerConfig => ({
  id: newServerId(),
  label: "My FHIR Server",
  baseUrl: "",
  authMode: "none",
});

export function SettingsPage() {
  const [servers, setServers] = useState<ServerConfig[]>(() => loadServers());
  const [activeId, setActiveId] = useState<string>(
    () => loadActiveServerId() ?? ACTIVE_SERVER_CONFIG.id,
  );
  const [testState, setTestState] = useState<Record<string, TestState>>({});
  const [anthropicKey, setAnthropicKey] = useState<string>(() => loadAnthropicApiKey());
  const [terminologyUrl, setTerminologyUrl] = useState<string>(
    () => loadStoredTerminologyBaseUrl() ?? "",
  );

  const updateTerminologyUrl = (next: string) => {
    setTerminologyUrl(next);
    saveTerminologyBaseUrl(next);
  };

  const updateAnthropicKey = (next: string) => {
    setAnthropicKey(next);
    saveAnthropicApiKey(next.trim());
  };

  const persist = (next: ServerConfig[]) => {
    setServers(next);
    saveServers(next);
  };

  const updateServer = (id: string, patch: Partial<ServerConfig>) => {
    persist(servers.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeServer = (id: string) => {
    const next = servers.filter((s) => s.id !== id);
    persist(next);
    if (activeId === id) {
      const fallback = next[0]?.id ?? "";
      saveActiveServerId(fallback);
      setActiveId(fallback);
    }
  };

  const addServer = () => {
    persist([...servers, blankServer()]);
  };

  const setActive = (id: string) => {
    saveActiveServerId(id);
    setActiveId(id);
  };

  const applyAndReload = (id: string) => {
    setActive(id);
    window.location.reload();
  };

  const testConnection = async (server: ServerConfig) => {
    setTestState((prev) => ({ ...prev, [server.id]: { status: "pending" } }));
    const result = await probeFhirServer(server);
    setTestState((prev) => ({
      ...prev,
      [server.id]: result.ok
        ? {
            status: "ok",
            ...(result.software ? { software: result.software } : {}),
            ...(result.fhirVersion ? { fhirVersion: result.fhirVersion } : {}),
          }
        : { status: "error", message: result.message },
    }));
  };

  return (
    <div className="space-y-6" data-testid="settings-page">
      <nav className="text-sm text-slate-500">
        <Link to="/" className="underline">
          ← Back
        </Link>
      </nav>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">FHIR server settings</h1>
        <p className="text-sm text-slate-600">
          Point the demo at any FHIR R4 server. Settings are stored in your browser
          (localStorage) — nothing leaves your device. Bearer tokens are saved in
          plaintext, so use a personal access token, not a privileged credential.
        </p>
      </header>

      <ul className="space-y-4">
        {servers.map((server) => (
          <li key={server.id}>
            <ServerForm
              server={server}
              isActive={activeId === server.id}
              testState={testState[server.id] ?? { status: "idle" }}
              onChange={(patch) => updateServer(server.id, patch)}
              onTest={() => testConnection(server)}
              onUse={() => applyAndReload(server.id)}
              onDelete={server.builtin ? null : () => removeServer(server.id)}
            />
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={addServer}
        className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        data-testid="add-server"
      >
        + Add server
      </button>

      <section
        className="space-y-3 rounded border border-slate-200 bg-white p-4 shadow-sm"
        data-testid="terminology-section"
      >
        <header className="space-y-1">
          <h2 className="text-base font-semibold text-slate-900">
            Terminology server
          </h2>
          <p className="text-xs text-slate-600">
            Routes <code>ValueSet/$expand</code> to a separate server so SNOMED,
            LOINC, ICD-10 and BCP-47 dropdowns populate even when the data
            server can't expand them. Defaults to{" "}
            <code>{DEFAULT_TERMINOLOGY_BASE_URL}</code> (HL7's community service)
            when blank. Reload after changing.
          </p>
          <p className="text-xs text-slate-500">
            Embedding a URL here does <em>not</em> grant a SNOMED license.
            Production deployments must use a licensed Ontoserver/Snowstorm and
            (for self-hosted) a CORS proxy.
          </p>
        </header>
        <label className="block space-y-1">
          <span className="block text-xs font-medium text-slate-700">
            Terminology base URL
          </span>
          <input
            type="url"
            value={terminologyUrl}
            onChange={(e) => updateTerminologyUrl(e.target.value)}
            placeholder={DEFAULT_TERMINOLOGY_BASE_URL}
            className={inputClass}
            autoComplete="off"
            data-testid="terminology-base-url-input"
          />
        </label>
      </section>

      <section
        className="space-y-3 rounded border border-slate-200 bg-white p-4 shadow-sm"
        data-testid="anthropic-section"
      >
        <header className="space-y-1">
          <h2 className="text-base font-semibold text-slate-900">
            Natural language queries
          </h2>
          <p className="text-xs text-slate-600">
            Paste an Anthropic API key to enable the{" "}
            <Link to="/fhir-ui/ask" className="underline">
              Ask
            </Link>{" "}
            page, which converts plain-English questions into FHIR search URLs.
            The key is stored in your browser only and is sent directly from the
            browser to api.anthropic.com.
          </p>
        </header>
        <label className="block space-y-1">
          <span className="block text-xs font-medium text-slate-700">
            Anthropic API key
          </span>
          <input
            type="password"
            value={anthropicKey}
            onChange={(e) => updateAnthropicKey(e.target.value)}
            placeholder="sk-ant-…"
            className={inputClass}
            autoComplete="off"
            data-testid="anthropic-api-key"
          />
        </label>
      </section>
    </div>
  );
}

interface ServerFormProps {
  server: ServerConfig;
  isActive: boolean;
  testState: TestState;
  onChange: (patch: Partial<ServerConfig>) => void;
  onTest: () => void;
  onUse: () => void;
  onDelete: (() => void) | null;
}

function ServerForm({
  server,
  isActive,
  testState,
  onChange,
  onTest,
  onUse,
  onDelete,
}: ServerFormProps) {
  const headers = useMemo<CustomHeader[]>(() => server.headers ?? [], [server.headers]);
  const hasSession = useHasSmartSession(server.id);
  const smartUser = useSmartUser(server.id);
  const [signingIn, setSigningIn] = useState(false);

  const updateHeaders = (next: CustomHeader[]) => {
    onChange({ headers: next.length > 0 ? next : undefined });
  };

  const handleSmartSignIn = async () => {
    setSigningIn(true);
    try {
      await smartAuthorize(server);
    } catch (err) {
      console.error("SMART authorize failed", err);
      setSigningIn(false);
    }
  };

  const handleSmartSignOut = () => {
    smartSignOut(server.id);
    window.location.reload();
  };

  return (
    <section
      className="space-y-3 rounded border border-slate-200 bg-white p-4 shadow-sm"
      data-testid="server-form"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-slate-900">
            {server.label || "(unnamed)"}
          </h2>
          {server.builtin && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500">
              built-in
            </span>
          )}
          {isActive && (
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] uppercase text-emerald-700">
              active
            </span>
          )}
          {server.authMode === "smart" && hasSession && (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] uppercase text-blue-700">
              signed in
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {server.authMode !== "smart" && (
            <button
              type="button"
              onClick={onTest}
              className="rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
              data-testid="test-connection"
            >
              Test connection
            </button>
          )}
          {!isActive && (
            <button
              type="button"
              onClick={onUse}
              className="rounded bg-slate-900 px-3 py-1 text-xs text-white hover:bg-slate-700"
              data-testid="use-server"
            >
              Use this server
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded border border-red-200 bg-white px-3 py-1 text-xs text-red-700 hover:bg-red-50"
              data-testid="delete-server"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Label">
          <input
            type="text"
            value={server.label}
            onChange={(e) => onChange({ label: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Base URL">
          <input
            type="url"
            value={server.baseUrl}
            onChange={(e) => onChange({ baseUrl: e.target.value })}
            placeholder="https://example.org/fhir"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Auth">
        <select
          value={server.authMode}
          onChange={(e) => {
            const mode = e.target.value as AuthMode;
            const patch: Partial<ServerConfig> = { authMode: mode };
            if (mode === "smart" && !server.smart) {
              patch.smart = {
                clientId: "",
                scope: DEFAULT_SMART_SCOPE,
              };
            }
            onChange(patch);
          }}
          className={inputClass}
        >
          <option value="none">None (open access)</option>
          <option value="bearer">Bearer token (static)</option>
          <option value="smart">SMART on FHIR v2 (OAuth2 + PKCE)</option>
        </select>
      </Field>

      {server.authMode === "bearer" && (
        <Field label="Bearer token">
          <input
            type="password"
            value={server.bearerToken ?? ""}
            onChange={(e) => onChange({ bearerToken: e.target.value })}
            placeholder="paste token"
            className={inputClass}
            autoComplete="off"
          />
        </Field>
      )}

      {server.authMode === "smart" && (
        <SmartFields
          server={server}
          hasSession={hasSession}
          smartUser={smartUser}
          signingIn={signingIn}
          onChange={onChange}
          onSignIn={handleSmartSignIn}
          onSignOut={handleSmartSignOut}
        />
      )}

      {server.authMode !== "smart" && (
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-slate-700">
            Custom headers
          </legend>
          {headers.length === 0 && (
            <p className="text-xs text-slate-500">
              None. Add e.g. <code>Epic-Client-ID</code> or a tenant header.
            </p>
          )}
          {headers.map((h, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={h.key}
                onChange={(e) =>
                  updateHeaders(
                    headers.map((existing, j) =>
                      j === i ? { ...existing, key: e.target.value } : existing,
                    ),
                  )
                }
                placeholder="Header name"
                className={`${inputClass} flex-1`}
              />
              <input
                type="text"
                value={h.value}
                onChange={(e) =>
                  updateHeaders(
                    headers.map((existing, j) =>
                      j === i ? { ...existing, value: e.target.value } : existing,
                    ),
                  )
                }
                placeholder="Value"
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={() => updateHeaders(headers.filter((_, j) => j !== i))}
                className="rounded border border-slate-300 bg-white px-2 text-xs text-slate-600 hover:bg-slate-50"
                aria-label="Remove header"
              >
                ×
              </button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => updateHeaders([...headers, { key: "", value: "" }])}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
            >
              + Add header
            </button>
            <button
              type="button"
              onClick={() =>
                updateHeaders([
                  ...headers,
                  { key: "Authorization", value: "Bearer " },
                ])
              }
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
              data-testid="add-bearer-header"
            >
              + Add bearer
            </button>
          </div>
        </fieldset>
      )}

      <TestResult state={testState} />
    </section>
  );
}

interface SmartFieldsProps {
  server: ServerConfig;
  hasSession: boolean;
  smartUser: { fhirUser: string | null; patientId: string | null };
  signingIn: boolean;
  onChange: (patch: Partial<ServerConfig>) => void;
  onSignIn: () => void;
  onSignOut: () => void;
}

function SmartFields({
  server,
  hasSession,
  smartUser,
  signingIn,
  onChange,
  onSignIn,
  onSignOut,
}: SmartFieldsProps) {
  const smart = server.smart ?? { clientId: "", scope: DEFAULT_SMART_SCOPE };
  const launchUri = getSmartLaunchUri();
  const redirectUri = getSmartRedirectUri();

  const patchSmart = (patch: Partial<typeof smart>) => {
    onChange({ smart: { ...smart, ...patch } });
  };

  return (
    <div className="space-y-3" data-testid="smart-fields">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Client ID">
          <input
            type="text"
            value={smart.clientId}
            onChange={(e) => patchSmart({ clientId: e.target.value })}
            placeholder="fhir-place-demo"
            className={inputClass}
            autoComplete="off"
            data-testid="smart-client-id"
          />
        </Field>
        <Field label="Scope">
          <input
            type="text"
            value={smart.scope}
            onChange={(e) => patchSmart({ scope: e.target.value })}
            placeholder={DEFAULT_SMART_SCOPE}
            className={inputClass}
            data-testid="smart-scope"
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={smart.offlineAccess ?? false}
          onChange={(e) => patchSmart({ offlineAccess: e.target.checked })}
          data-testid="smart-offline-access"
        />
        Request <code>offline_access</code> (long-lived refresh token)
      </label>

      {/* Session state */}
      {hasSession ? (
        <div className="flex flex-wrap items-center gap-3 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
          <span>
            ✓ Signed in
            {smartUser.fhirUser && (
              <> as <code>{smartUser.fhirUser}</code></>
            )}
            {smartUser.patientId && (
              <> · Patient <code>{smartUser.patientId}</code></>
            )}
          </span>
          <button
            type="button"
            onClick={onSignOut}
            className="rounded border border-blue-300 bg-white px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100"
            data-testid="smart-sign-out"
          >
            Sign out
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onSignIn}
          disabled={signingIn || !smart.clientId}
          className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          data-testid="smart-sign-in"
        >
          {signingIn ? "Redirecting…" : "Sign in with SMART"}
        </button>
      )}

      {/* Registration info */}
      <details className="group">
        <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700">
          EHR registration URIs
        </summary>
        <div className="mt-2 space-y-2">
          <CopyField label="Launch URI (EHR launch)" value={launchUri} />
          <CopyField label="Redirect URI (callback)" value={redirectUri} />
          <p className="text-xs text-slate-500">
            Paste these into your EHR's app registration (e.g.{" "}
            <a
              href="https://launch.smarthealthit.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              launch.smarthealthit.org
            </a>
            ) to test the full EHR launch flow.
          </p>
        </div>
      </details>
    </div>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="space-y-0.5">
      <span className="block text-xs font-medium text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <code className="flex-1 break-all rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
          {value}
        </code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function TestResult({ state }: { state: TestState }) {
  if (state.status === "idle") return null;
  if (state.status === "pending") {
    return <p className="text-xs text-slate-500">Testing…</p>;
  }
  if (state.status === "ok") {
    const parts = [state.software, state.fhirVersion && `FHIR ${state.fhirVersion}`]
      .filter(Boolean)
      .join(" · ");
    return (
      <p
        className="rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800"
        data-testid="test-ok"
      >
        ✓ Connected{parts ? ` — ${parts}` : ""}
      </p>
    );
  }
  return (
    <p
      className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700"
      data-testid="test-error"
    >
      ✗ {state.message}
    </p>
  );
}

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 focus:border-slate-500 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="block text-xs font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
