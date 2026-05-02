import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ACTIVE_SERVER_CONFIG } from "../config.js";
import { useHasSmartSession } from "./smartSession.js";

interface Props {
  children: ReactNode;
}

/**
 * Gate that wraps FHIR UI pages when the active server uses SMART auth.
 * When there is no active SMART session (e.g. after a page reload that didn't
 * complete the OAuth flow), renders a sign-in prompt instead of the children.
 *
 * This is a soft gate — FHIR requests without a bearer token will simply
 * return 401 from the server; this component provides a clear CTA before that
 * happens.
 */
export function RequireSmartSession({ children }: Props) {
  const isSmart = ACTIVE_SERVER_CONFIG.authMode === "smart";
  const hasSession = useHasSmartSession(ACTIVE_SERVER_CONFIG.id);

  if (!isSmart || hasSession) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center text-slate-600">
      <svg
        className="h-12 w-12 text-slate-400"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
        />
      </svg>
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Sign in required</h2>
        <p className="mt-1 max-w-xs text-sm">
          This server uses SMART on FHIR authentication. Sign in to continue.
        </p>
      </div>
      <Link
        to="/fhir-ui/settings"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Go to Settings to sign in
      </Link>
    </div>
  );
}
