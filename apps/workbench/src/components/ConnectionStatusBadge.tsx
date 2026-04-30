import type { ConnectionRow } from "../api/connections.js";

export function ConnectionStatusBadge({ connection }: { connection: ConnectionRow }) {
  const status = connection.lastCapabilityStatus;
  if (status === "ok") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        connected
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      untested
    </span>
  );
}
