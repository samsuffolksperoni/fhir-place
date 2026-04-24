import { useSearch } from "@fhir-place/react-fhir";
import type { Resource } from "fhir/r4";
import { PATIENT_COMPARTMENT } from "../compartment.js";

/**
 * Short label per compartment resource type for tight inline layouts (e.g.
 * the Patient list row). Keeps each chip narrow enough that all 7 fit on a
 * phone-width row without wrapping heavily.
 */
const SHORT_LABEL: Record<string, string> = {
  Condition: "Cond",
  MedicationRequest: "Meds",
  AllergyIntolerance: "Allg",
  Observation: "Obs",
  Procedure: "Proc",
  Encounter: "Enc",
  Immunization: "Imm",
};

interface PatientRowCountsProps {
  patientId: string;
}

/**
 * Compact dot-separated row showing the number of compartment resources
 * (Condition / MedicationRequest / … ) for a single patient. One `_summary=
 * count` search fires per type; results cache so they're cheap on re-render.
 *
 * Rendered inline within a Patient list row. Keep visually lightweight:
 * dimmed zero counts, small font, single-line layout that wraps when needed.
 */
export function PatientRowCounts({ patientId }: PatientRowCountsProps) {
  return (
    <span
      data-testid="patient-row-counts"
      className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-slate-500"
    >
      {PATIENT_COMPARTMENT.map((section, i) => (
        <CountChip
          key={section.resourceType}
          patientId={patientId}
          resourceType={section.resourceType}
          label={SHORT_LABEL[section.resourceType] ?? section.resourceType}
          leading={i > 0}
        />
      ))}
    </span>
  );
}

interface CountChipProps {
  patientId: string;
  resourceType: string;
  label: string;
  leading: boolean;
}

function CountChip({ patientId, resourceType, label, leading }: CountChipProps) {
  const { data, isLoading } = useSearch<Resource>(resourceType, {
    patient: patientId,
    _summary: "count",
    _count: 0,
  });
  const count = data?.total;
  const display = isLoading ? "…" : count ?? "?";
  const muted = count === 0;

  return (
    <span
      data-testid={`patient-row-count-${resourceType}`}
      className={muted ? "text-slate-300" : undefined}
    >
      {leading && <span className="mr-2 text-slate-300">·</span>}
      {label} <span className="font-mono tabular-nums">{display}</span>
    </span>
  );
}
