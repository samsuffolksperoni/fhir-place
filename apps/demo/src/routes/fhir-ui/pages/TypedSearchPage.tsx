import { searchBuilder, useTypedSearch } from "@fhir-place/react-fhir";
import type { Patient } from "fhir/r4";
import { CC_FONT, CC_MONO } from "../../../components/ccStyles.js";

const BEFORE_SNIPPET = `// Without useTypedSearch: plain string key/value pairs.
// No IDE completion, no compile-time check on param names.
const { data } = useSearch("Patient", {
  name: "Smith",
  _include: "Patient:general-practitioner",
});`;

const AFTER_SNIPPET = `// With useTypedSearch: builder gives autocomplete and a
// TypeScript error when a param or include is wrong.
const { data } = useTypedSearch(
  searchBuilder("Patient")
    .where("name", "Smith")
    .include("Patient:general-practitioner")
);`;

export function TypedSearchPage() {
  const builder = searchBuilder("Patient")
    .where("name", "Smith")
    .include("Patient:general-practitioner");

  const { data, isLoading, isError, error } = useTypedSearch<Patient>(builder);

  const patients =
    data?.entry?.flatMap((e) => (e.resource ? [e.resource] : [])) ?? [];

  return (
    <div
      data-testid="typed-search-page"
      style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto", fontFamily: CC_FONT }}
    >
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 6px", letterSpacing: -0.3, color: "var(--text)" }}>
          Typed Search Builder
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
          <code style={{ fontFamily: CC_MONO, fontSize: 12 }}>useTypedSearch</code> wires the{" "}
          <code style={{ fontFamily: CC_MONO, fontSize: 12 }}>searchBuilder</code> into TanStack
          Query. Params are validated at compile time; the cache key is identical to{" "}
          <code style={{ fontFamily: CC_MONO, fontSize: 12 }}>useSearch</code>, so mutations
          invalidate correctly.
        </p>
      </div>

      {/* Before / After */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <CodeCard label="Before — raw params" snippet={BEFORE_SNIPPET} accent="var(--border)" />
        <CodeCard label="After — typed builder" snippet={AFTER_SNIPPET} accent="var(--accent)" />
      </div>

      {/* Live query result */}
      <section
        style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 20 }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "var(--text)" }}>
            Live result
          </h2>
          <span
            data-testid="typed-search-total"
            style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: CC_MONO }}
          >
            {isLoading ? "loading…" : isError ? "error" : data?.total !== undefined ? `${data.total.toLocaleString()} total` : `${patients.length} loaded`}
          </span>
        </div>

        <div
          data-testid="typed-search-preview"
          title={builder.build()}
          style={{ padding: "8px 12px", background: "var(--sunken)", border: "1px solid var(--border)", borderRadius: 6, fontFamily: CC_MONO, fontSize: 11, color: "var(--text-muted)", marginBottom: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {builder.build()}
        </div>

        {isError && (
          <div
            data-testid="typed-search-error"
            style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid var(--danger)", background: "var(--danger-soft)", fontSize: 13, color: "var(--danger)", marginBottom: 12 }}
          >
            {(error as Error)?.message ?? "Search failed"}
          </div>
        )}

        {isLoading && (
          <p data-testid="typed-search-loading" style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            Loading…
          </p>
        )}

        {!isLoading && !isError && patients.length === 0 && (
          <p data-testid="typed-search-empty" style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, textAlign: "center" }}>
            No patients match.
          </p>
        )}

        {patients.length > 0 && (
          <ul data-testid="typed-search-results" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {patients.map((p, i) => {
              const name = p.name?.[0];
              const display = name
                ? [name.family, ...(name.given ?? [])].filter(Boolean).join(", ")
                : p.id ?? "—";
              return (
                <li
                  key={p.id ?? i}
                  data-testid="typed-search-patient-row"
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: i < patients.length - 1 ? "1px solid var(--border)" : "none", fontSize: 13, color: "var(--text)" }}
                >
                  <span>{display}</span>
                  <span style={{ fontFamily: CC_MONO, fontSize: 11, color: "var(--text-muted)" }}>{p.id}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function CodeCard({ label, snippet, accent }: { label: string; snippet: string; accent: string }) {
  return (
    <div style={{ background: "var(--surface)", border: `1px solid ${accent}`, borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-subtle)", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 }}>
        {label}
      </div>
      <pre style={{ margin: 0, fontSize: 11, lineHeight: 1.6, color: "var(--text)", fontFamily: CC_MONO, whiteSpace: "pre-wrap", overflowX: "auto" }}>
        {snippet}
      </pre>
    </div>
  );
}
