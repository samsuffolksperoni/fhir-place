import { useLocation, useNavigate } from "react-router-dom";
import { ACTIVE_SERVER_CONFIG } from "../config.js";
import { TOP_RESOURCE_TYPES } from "../resourceListConfig.js";
import { CC_MONO } from "./ccStyles.js";

export function CCSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeType = (() => {
    const m = location.pathname.match(/^\/fhir-ui\/([^/]+)/);
    if (!m) return null;
    const rt = m[1];
    return TOP_RESOURCE_TYPES.includes(rt as (typeof TOP_RESOURCE_TYPES)[number]) ? rt : null;
  })();

  return (
    <div
      data-testid="fhir-ui-sidebar"
      style={{
        width: 260,
        borderRight: "1px solid var(--border)",
        background: "var(--surface)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        height: "100%",
      }}
    >
      {/* Server picker */}
      <div style={{ padding: "14px 12px", borderBottom: "1px solid var(--border)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 10px",
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "var(--sunken)",
            cursor: "pointer",
          }}
          onClick={() => navigate("/fhir-ui/settings")}
          title="Manage servers"
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: "var(--success)",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.2 }}>
              {ACTIVE_SERVER_CONFIG.label}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                fontFamily: CC_MONO,
                lineHeight: 1.2,
                marginTop: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {ACTIVE_SERVER_CONFIG.baseUrl}
            </div>
          </div>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
            <path d="M3 5l3-3 3 3M3 7l3 3 3-3" />
          </svg>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            border: "1px solid var(--border)",
            borderRadius: 6,
            background: "var(--bg)",
            cursor: "text",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="var(--text-subtle)" strokeWidth="1.5">
            <circle cx="6" cy="6" r="4.5" />
            <path d="M9.5 9.5L13 13" />
          </svg>
          <span style={{ fontSize: 12, color: "var(--text-subtle)", flex: 1 }}>Jump to…</span>
          <span
            style={{
              fontSize: 10,
              color: "var(--text-subtle)",
              fontFamily: CC_MONO,
              padding: "1px 5px",
              border: "1px solid var(--border)",
              borderRadius: 3,
            }}
          >
            ⌘K
          </span>
        </div>
      </div>

      {/* Resources */}
      <div style={{ padding: "12px 8px", overflowY: "auto", flex: 1 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "var(--text-subtle)",
            letterSpacing: 0.6,
            textTransform: "uppercase",
            padding: "6px 10px 8px",
          }}
        >
          Resources
        </div>
        {TOP_RESOURCE_TYPES.map((rt) => {
          const isActive = rt === activeType;
          return (
            <div
              key={rt}
              onClick={() => navigate(`/fhir-ui/${rt}`)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 10px",
                borderRadius: 6,
                background: isActive ? "var(--accent-soft)" : "transparent",
                color: isActive ? "var(--accent-text)" : "var(--text)",
                cursor: "pointer",
                marginBottom: 1,
                transition: "background 80ms ease",
              }}
              data-testid={`sidebar-link-${rt}`}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {rt}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "10px 14px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          FP
        </div>
        <div style={{ flex: 1, fontSize: 12, color: "var(--text)" }}>fhir-place</div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
          <circle cx="6" cy="6" r="4.5" />
          <path d="M6 4v2M6 8h.01" />
        </svg>
      </div>
    </div>
  );
}
