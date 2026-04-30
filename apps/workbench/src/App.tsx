import { Route, Routes } from "react-router-dom";
import { SyntheticOnlyBanner } from "./components/SyntheticOnlyBanner.js";
import { HomePage } from "./pages/HomePage.js";
import { FHIR_BASE_URL, USE_MOCK } from "./config.js";

export function App() {
  return (
    <div className="min-h-screen">
      <SyntheticOnlyBanner />
      <header className="border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <span className="text-lg font-semibold text-slate-900">
              fhir-place
            </span>
            <span className="ml-2 text-sm text-slate-500">
              agent workbench · phase a
            </span>
          </div>
          <div className="text-xs text-slate-500" data-testid="base-url">
            {USE_MOCK ? "mock" : "live"} · {FHIR_BASE_URL}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </main>
    </div>
  );
}
