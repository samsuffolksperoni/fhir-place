import { useSearch } from "@fhir-place/react-fhir";
import type { Resource } from "fhir/r4";
import { Link } from "react-router-dom";
import { PATIENT_COMPARTMENT } from "../compartment.js";

export interface PatientCompartmentLinksProps {
  patientId: string;
}

/**
 * Compact chip grid at the top of a Patient's detail page. One chip per
 * compartment resource type showing `{Label} ({count})`; chips link to the
 * type's index page scoped to the current patient.
 */
export function PatientCompartmentLinks({
  patientId,
}: PatientCompartmentLinksProps) {
  return (
    <nav
      aria-label="Patient clinical data links"
      data-testid="compartment-links"
      className="flex flex-wrap gap-2"
    >
      {PATIENT_COMPARTMENT.map((section) => (
        <CompartmentChip
          key={section.resourceType}
          patientId={patientId}
          resourceType={section.resourceType}
          label={section.title}
        />
      ))}
    </nav>
  );
}

function CompartmentChip({
  patientId,
  resourceType,
  label,
}: {
  patientId: string;
  resourceType: string;
  label: string;
}) {
  // `_summary=count` asks the server to return just the `total` with no
  // entries — cheap. Not every server respects it; fallback is a tiny
  // `_count=1` hit.
  const { data, isLoading } = useSearch<Resource>(resourceType, {
    patient: patientId,
    _summary: "count",
    _count: 0,
  });
  const count = data?.total;

  return (
    <Link
      to={`/${resourceType}?patient=${patientId}`}
      data-testid={`compartment-chip-${resourceType}`}
      className="inline-flex items-baseline gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm hover:border-slate-400 hover:bg-slate-50"
    >
      <span className="font-medium text-slate-800">{label}</span>
      <span className="text-xs text-slate-500">
        {isLoading ? "…" : count !== undefined ? `(${count})` : ""}
      </span>
    </Link>
  );
}
