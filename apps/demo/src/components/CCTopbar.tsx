import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext.js";
import { CC_FONT, CC_MONO, ccBtn } from "./ccStyles.js";

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="7" cy="7" r="2.5" />
      <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.6 2.6l1 1M10.4 10.4l1 1M11.4 2.6l-1 1M3.6 10.4l-1 1" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M11 8A5 5 0 016 3a5 5 0 100 10 5 5 0 005-5z" />
    </svg>
  );
}

export function CCTopbar() {
  const location = useLocation();
  const { theme, toggle } = useTheme();

  // useParams() returns {} when rendered outside <Routes>, so parse from pathname directly.
  const p = location.pathname;
  const routeMatch = p.match(/^\/fhir-ui\/([^/]+?)(?:\/([^/]+?)(?:\/(edit))?)?$/);
  const resourceType = routeMatch?.[1];
  const id = routeMatch?.[2];

  const breadcrumb = (() => {
    if (p === "/fhir-ui/settings") return ["Settings", "Servers"];
    if (p === "/fhir-ui/ask") return ["Ask"];
    if (id) {
      const suffix = p.endsWith("/edit") ? ["edit"] : [];
      return ["FHIR Explorer", resourceType ?? "", id, ...suffix].filter(Boolean);
    }
    if (resourceType) return ["FHIR Explorer", resourceType];
    return ["FHIR Explorer"];
  })();

  const showNew = resourceType && !id && resourceType !== "settings" && resourceType !== "ask";

  return (
    <div
      style={{
        height: 44,
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 16,
        flexShrink: 0,
      }}
    >
      {/* Breadcrumb */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          color: "var(--text-muted)",
          fontFamily: CC_FONT,
          minWidth: 0,
        }}
      >
        {breadcrumb.map((b, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span
              style={{
                color: i === breadcrumb.length - 1 ? "var(--text)" : "var(--text-muted)",
                fontWeight: i === breadcrumb.length - 1 ? 500 : 400,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontFamily: i > 1 ? CC_MONO : CC_FONT,
                fontSize: i > 1 ? 12 : 13,
              }}
            >
              {b}
            </span>
            {i < breadcrumb.length - 1 && (
              <span style={{ color: "var(--text-subtle)", flexShrink: 0 }}>/</span>
            )}
          </span>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          onClick={toggle}
          style={ccBtn("ghost")}
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          {theme === "light" ? <MoonIcon /> : <SunIcon />}
        </button>
        <button style={ccBtn("ghost")}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 4h10M2 7h10M2 10h6" />
          </svg>
          History
        </button>
        {showNew && (
          <Link
            to={`/fhir-ui/${resourceType}/new`}
            style={ccBtn("primary")}
            data-testid={`create-${resourceType?.toLowerCase()}`}
          >
            + New {resourceType}
          </Link>
        )}
      </div>
    </div>
  );
}
