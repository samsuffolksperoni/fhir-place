import type { HumanName, Patient } from "fhir/r4";

export function patientDisplayName(patient: Patient | undefined): string {
  if (!patient) return "(unknown)";
  const official = patient.name?.find((n) => n.use === "official");
  const usual = patient.name?.find((n) => n.use === "usual");
  return formatHumanName(official ?? usual ?? patient.name?.[0]);
}

export function formatHumanName(name: HumanName | undefined): string {
  if (!name) return "(no name)";
  if (name.text) return name.text;
  const given = (name.given ?? []).join(" ");
  const family = name.family ?? "";
  return [given, family].filter(Boolean).join(" ").trim() || "(no name)";
}

export function PatientName({ patient }: { patient: Patient | undefined }) {
  return <>{patientDisplayName(patient)}</>;
}
