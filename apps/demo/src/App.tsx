import { Link, Navigate, Route, Routes, useParams } from "react-router-dom";
import { AskPage } from "./routes/fhir-ui/pages/AskPage.js";
import { PatientCreatePage } from "./routes/fhir-ui/pages/PatientCreatePage.js";
import { PatientListPage } from "./routes/fhir-ui/pages/PatientListPage.js";
import { ResourceDetailPage } from "./routes/fhir-ui/pages/ResourceDetailPage.js";
import { ResourceEditPage } from "./routes/fhir-ui/pages/ResourceEditPage.js";
import { ResourceIndexPage } from "./routes/fhir-ui/pages/ResourceIndexPage.js";
import { SettingsPage } from "./routes/fhir-ui/pages/SettingsPage.js";
import { CqlRunnerPage } from "./routes/cql-runner/CqlRunnerPage.js";
import { ServerPicker } from "./components/ServerPicker.js";
import { FHIR_BASE_URL, SETTINGS_ENABLED, USE_MOCK } from "./config.js";

export function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-4">
            <Link to="/" className="text-lg font-semibold text-slate-900">
              fhir-place
            </Link>
            <nav className="flex items-baseline gap-3 text-sm">
              <Link to="/fhir-ui/Patient" className="text-slate-700 underline">
                FHIR UI
              </Link>
              <Link to="/cql-runner" className="text-slate-700 underline">
                CQL Runner
              </Link>
              <Link to="/fhir-ui/ask" className="text-slate-600 underline">
                Ask
              </Link>
            </nav>
            <span className="text-sm text-slate-500">
              backend-agnostic, spec-driven React for any FHIR REST API
            </span>
          </div>
          {SETTINGS_ENABLED ? (
            <ServerPicker />
          ) : (
            <div className="text-xs text-slate-500" data-testid="base-url">
              {USE_MOCK ? "mock" : "live"} · {FHIR_BASE_URL}
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-6">
        <Routes>
          <Route path="/" element={<Navigate to="/fhir-ui/Patient" replace />} />
          {/* CQL runner */}
          <Route path="/cql-runner" element={<CqlRunnerPage />} />
          {/* FHIR UI surface */}
          <Route path="/fhir-ui" element={<Navigate to="/fhir-ui/Patient" replace />} />
          <Route path="/fhir-ui/ask" element={<AskPage />} />
          <Route path="/fhir-ui/Patient" element={<PatientListPage />} />
          <Route path="/fhir-ui/Patient/new" element={<PatientCreatePage />} />
          <Route path="/fhir-ui/settings" element={<SettingsPage />} />
          <Route path="/fhir-ui/:resourceType/:id/edit" element={<ResourceEditPage />} />
          <Route path="/fhir-ui/:resourceType/:id" element={<ResourceDetailPage />} />
          <Route path="/fhir-ui/:resourceType" element={<ResourceIndexPage />} />
          {/* Backwards-compat redirects from the old flat layout */}
          <Route path="/ask" element={<Navigate to="/fhir-ui/ask" replace />} />
          <Route path="/settings" element={<Navigate to="/fhir-ui/settings" replace />} />
          <Route path="/Patient/new" element={<Navigate to="/fhir-ui/Patient/new" replace />} />
          <Route
            path="/:resourceType/:id/edit"
            element={<RedirectToFhirUi suffix="/edit" includeId />}
          />
          <Route
            path="/:resourceType/:id"
            element={<RedirectToFhirUi includeId />}
          />
          <Route path="/:resourceType" element={<RedirectToFhirUi />} />
        </Routes>
      </main>
    </div>
  );
}

// Forwards old flat URLs like /Patient/123/edit to /fhir-ui/Patient/123/edit.
function RedirectToFhirUi({
  includeId = false,
  suffix = "",
}: {
  includeId?: boolean;
  suffix?: string;
}) {
  const { resourceType, id } = useParams();
  const target = includeId
    ? `/fhir-ui/${resourceType}/${id}${suffix}`
    : `/fhir-ui/${resourceType}`;
  return <Navigate to={target} replace />;
}
