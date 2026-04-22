import {
  ResourceEditor,
  useCreateResource,
} from "@fhir-place/react-fhir";
import type { Patient } from "fhir/r4";
import { Link, useNavigate } from "react-router-dom";

export function PatientCreatePage() {
  const navigate = useNavigate();
  const create = useCreateResource<Patient>();

  return (
    <div className="space-y-4">
      <nav className="text-sm text-slate-500">
        <Link to="/Patient" className="underline">
          ← All patients
        </Link>
      </nav>
      <ResourceEditor
        resource={{ resourceType: "Patient" }}
        saveLabel="Create patient"
        saving={create.isPending}
        onCancel={() => navigate("/Patient")}
        onSave={async (draft) => {
          const created = await create.mutateAsync(draft as Patient);
          navigate(`/Patient/${created.id}`);
        }}
        className="space-y-4 rounded border border-slate-200 bg-white p-4 shadow-sm"
      />
      {create.isError && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {(create.error as Error)?.message}
        </p>
      )}
    </div>
  );
}
