import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createConnection,
  type AuthType,
  type ConnectionKind,
  type CreateConnectionInput,
} from "../api/connections.js";

export function NewConnectionPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("http://localhost:8080/fhir");
  const [authType, setAuthType] = useState<AuthType>("none");
  const [authToken, setAuthToken] = useState("");

  const create = useMutation({
    mutationFn: (input: CreateConnectionInput) => createConnection(input),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["connections"] });
      navigate(`/connections/${row.id}`);
    },
  });

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">New FHIR connection</h1>
        <p className="mt-1 text-sm text-slate-600">
          Configure a FHIR server to read from. Phase A supports{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">fhir_clinical</code>{" "}
          with{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">none</code> or{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">bearer</code>{" "}
          auth only.
        </p>
      </header>

      <form
        className="space-y-4 rounded-md border border-slate-200 bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const input: CreateConnectionInput = {
            name: name.trim(),
            kind: "fhir_clinical" satisfies ConnectionKind,
            baseUrl: baseUrl.trim(),
            authType,
            ...(authType === "bearer" ? { authToken } : {}),
          };
          create.mutate(input);
        }}
      >
        <Field label="Name" htmlFor="name">
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
            placeholder="Local HAPI sandbox"
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </Field>

        <Field label="Base URL" htmlFor="baseUrl">
          <input
            id="baseUrl"
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            required
            placeholder="http://localhost:8080/fhir"
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </Field>

        <Field label="Auth type" htmlFor="authType">
          <select
            id="authType"
            value={authType}
            onChange={(e) => setAuthType(e.target.value as AuthType)}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="none">none</option>
            <option value="bearer">bearer</option>
          </select>
        </Field>

        {authType === "bearer" && (
          <Field label="Bearer token" htmlFor="authToken">
            <input
              id="authToken"
              type="password"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              required
              maxLength={4096}
              autoComplete="off"
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-mono"
            />
            <p className="mt-1 text-xs text-slate-500">
              Stored locally in SQLite. Synthetic environments only.
            </p>
          </Field>
        )}

        {create.isError && (
          <p className="rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">
            {(create.error as Error).message}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {create.isPending ? "Creating…" : "Create connection"}
          </button>
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}
