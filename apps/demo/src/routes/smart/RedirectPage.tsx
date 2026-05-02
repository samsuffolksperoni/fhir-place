import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ACTIVE_SERVER_CONFIG } from "../../config.js";
import { setCachedClient, smartReady } from "../../smart/smartSession.js";

/**
 * OAuth2 redirect callback page for SMART App Launch.
 *
 * After the user approves access on the authorization server, the browser is
 * redirected here with `?code=...&state=...`. This page calls
 * `FHIR.oauth2.ready()` to exchange the code for tokens, stores the resulting
 * client, and navigates the user into the app.
 */
export function RedirectPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    smartReady(ACTIVE_SERVER_CONFIG.id)
      .then((client) => {
        // Ensure the client is cached even if the active server ID changed.
        setCachedClient(ACTIVE_SERVER_CONFIG.id, client);

        // Navigate to the patient's record if a patient context was granted.
        const patientId = client.getPatientId();
        if (patientId) {
          navigate(`/fhir-ui/Patient/${patientId}`, { replace: true });
        } else {
          navigate("/fhir-ui/Patient", { replace: true });
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      });
  }, [navigate]);

  if (error) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-6 text-red-800">
        <h1 className="mb-1 text-lg font-semibold">SMART Authorization Failed</h1>
        <p className="text-sm">{error}</p>
        <p className="mt-2 text-sm">
          <a href="/" className="underline">
            Return to home
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
      <p className="text-sm">Completing authorization…</p>
    </div>
  );
}
