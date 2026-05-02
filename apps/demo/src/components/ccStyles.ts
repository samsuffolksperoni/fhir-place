/** Shared style helpers for the Clean Clinical design system. */

export const CC_FONT = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
export const CC_MONO = "'JetBrains Mono', ui-monospace, Menlo, monospace";

type BtnKind = "primary" | "secondary" | "ghost" | "danger";

export function ccBtn(kind: BtnKind = "ghost"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    fontWeight: 500,
    padding: "6px 11px",
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: CC_FONT,
    border: "1px solid transparent",
    lineHeight: 1.2,
    background: "none",
    whiteSpace: "nowrap",
    transition: "background 80ms ease, color 80ms ease",
  };
  if (kind === "primary")
    return { ...base, background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" };
  if (kind === "secondary")
    return { ...base, background: "var(--surface)", color: "var(--text)", borderColor: "var(--border)" };
  if (kind === "danger")
    return { ...base, background: "var(--danger-soft)", color: "var(--danger)", borderColor: "var(--danger)" };
  // ghost
  return { ...base, background: "transparent", color: "var(--text-muted)" };
}

export function statusPill(status: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 12,
    padding: "2px 7px",
    borderRadius: 999,
    border: "1px solid var(--border)",
    whiteSpace: "nowrap",
  };
  if (status === "active")
    return { ...base, background: "var(--success-soft)", color: "var(--success)" };
  if (status === "resolved" || status === "completed")
    return { ...base, background: "var(--accent-soft)", color: "var(--accent-text)" };
  return { ...base, background: "var(--chip)", color: "var(--chip-text)" };
}
