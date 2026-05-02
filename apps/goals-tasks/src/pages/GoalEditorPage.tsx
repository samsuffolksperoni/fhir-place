import {
  ResourceEditor,
  useCreateResource,
  useResource,
  useUpdateResource,
} from "@fhir-place/react-fhir";
import type { Goal } from "fhir/r4";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DEMO_PATIENT_ID } from "../config.js";

export function GoalEditorPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const { data: existing } = useResource<Goal>("Goal", id);
  const create = useCreateResource<Goal>();
  const update = useUpdateResource<Goal>();

  const seed: Goal = existing ?? {
    resourceType: "Goal",
    lifecycleStatus: "proposed",
    description: { text: "" },
    subject: { reference: `Patient/${DEMO_PATIENT_ID}` },
  };

  const saving = create.isPending || update.isPending;
  const error = create.isError ? create.error : update.isError ? update.error : null;

  const onSave = async (draft: Goal) => {
    if (isEdit) {
      await update.mutateAsync(draft as Goal & { id: string });
      navigate(`/Goal/${id}`);
    } else {
      const created = await create.mutateAsync(draft);
      navigate(`/Goal/${created.id}`);
    }
  };

  return (
    <div className="space-y-4">
      <nav className="text-sm text-slate-500">
        <Link to={isEdit ? `/Goal/${id}` : "/"} className="underline">
          ← {isEdit ? `Back to goal` : "Back to patient"}
        </Link>
      </nav>

      {isEdit && !existing && (
        <p className="text-sm text-slate-500">Loading goal…</p>
      )}

      {(!isEdit || existing) && (
        <ResourceEditor
          resource={seed}
          saveLabel={isEdit ? "Save changes" : "Create goal"}
          saving={saving}
          onCancel={() => navigate(isEdit ? `/Goal/${id}` : "/")}
          onSave={(draft) => onSave(draft as Goal)}
          className="space-y-4 rounded border border-slate-200 bg-white p-4 shadow-sm"
        />
      )}

      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {(error as Error).message}
        </p>
      )}
    </div>
  );
}
