import type { Goal, Patient, Task } from "fhir/r4";

export const patientLabel = (p: Patient | undefined): string => {
  if (!p) return "";
  const n = p.name?.[0];
  if (!n) return p.id ?? "";
  if (n.text) return n.text;
  return [n.given?.join(" "), n.family].filter(Boolean).join(" ");
};

export const goalLabel = (g: Goal | undefined): string =>
  g?.description?.text ?? `Goal/${g?.id ?? ""}`;

export const taskLabel = (t: Task | undefined): string =>
  t?.description ?? `Task/${t?.id ?? ""}`;

const statusColor: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  requested: "bg-amber-100 text-amber-800",
  received: "bg-amber-100 text-amber-800",
  accepted: "bg-blue-100 text-blue-800",
  ready: "bg-blue-100 text-blue-800",
  "in-progress": "bg-indigo-100 text-indigo-800",
  "on-hold": "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-slate-100 text-slate-500 line-through",
  rejected: "bg-red-100 text-red-800",
  failed: "bg-red-100 text-red-800",
  "entered-in-error": "bg-red-100 text-red-800",
  proposed: "bg-slate-100 text-slate-700",
  planned: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
};

export const statusPillClass = (status: string | undefined): string =>
  `inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColor[status ?? ""] ?? "bg-slate-100 text-slate-700"}`;
