import { Link, Navigate, Route, Routes } from "react-router-dom";
import { PatientListPage } from "./pages/PatientListPage.js";
import { ResourceDetailPage } from "./pages/ResourceDetailPage.js";
import { FHIR_BASE_URL, USE_MOCK } from "./config.js";

export function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <Link to="/" className="text-lg font-semibold text-slate-900">
              fhir-place
            </Link>
            <span className="ml-2 text-sm text-slate-500">
              spec-driven FHIR viewer
            </span>
          </div>
          <div className="text-xs text-slate-500" data-testid="base-url">
            {USE_MOCK ? "mock" : "live"} · {FHIR_BASE_URL}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-6">
        <Routes>
          <Route path="/" element={<Navigate to="/Patient" replace />} />
          <Route path="/Patient" element={<PatientListPage />} />
          <Route path="/:resourceType/:id" element={<ResourceDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}
