import { Outlet } from "react-router-dom";

/** Formerly held a secondary sidebar; now the CCSidebar in App.tsx covers that. */
export function FhirUiLayout() {
  return <Outlet />;
}
