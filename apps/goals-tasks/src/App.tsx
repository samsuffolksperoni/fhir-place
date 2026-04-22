import { Link, Navigate, Route, Routes } from "react-router-dom";
import { GoalDetailPage } from "./pages/GoalDetailPage.js";
import { GoalEditorPage } from "./pages/GoalEditorPage.js";
import { PatientOverviewPage } from "./pages/PatientOverviewPage.js";
import { TaskDetailPage } from "./pages/TaskDetailPage.js";
import { TaskEditorPage } from "./pages/TaskEditorPage.js";
import { FHIR_BASE_URL, USE_MOCK } from "./config.js";

export function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <Link to="/" className="text-lg font-semibold text-slate-900">
              Goals &amp; Tasks
            </Link>
            <span className="ml-2 hidden text-sm text-slate-500 sm:inline">
              sample app · built on @fhir-place/react-fhir
            </span>
          </div>
          <div className="text-xs text-slate-500" data-testid="base-url">
            {USE_MOCK ? "mock" : "live"} · {FHIR_BASE_URL}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <Routes>
          <Route path="/" element={<PatientOverviewPage />} />
          <Route path="/Goal/new" element={<GoalEditorPage />} />
          <Route path="/Goal/:id" element={<GoalDetailPage />} />
          <Route path="/Goal/:id/edit" element={<GoalEditorPage />} />
          <Route path="/Task/new" element={<TaskEditorPage />} />
          <Route path="/Task/:id" element={<TaskDetailPage />} />
          <Route path="/Task/:id/edit" element={<TaskEditorPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
