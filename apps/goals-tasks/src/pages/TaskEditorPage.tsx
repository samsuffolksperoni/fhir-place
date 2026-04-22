import {
  ResourceEditor,
  useCreateResource,
  useResource,
  useUpdateResource,
} from "@fhir-place/react-fhir";
import type { Task } from "fhir/r4";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { DEMO_PATIENT_ID } from "../config.js";

export function TaskEditorPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const { data: existing } = useResource<Task>("Task", id);
  const create = useCreateResource<Task>();
  const update = useUpdateResource<Task>();

  const goalId = searchParams.get("goal");
  const seed: Task = existing ?? {
    resourceType: "Task",
    status: "requested",
    intent: "plan",
    priority: "routine",
    for: { reference: `Patient/${DEMO_PATIENT_ID}` },
    ...(goalId ? { focus: { reference: `Goal/${goalId}` } } : {}),
    authoredOn: new Date().toISOString(),
  };

  const saving = create.isPending || update.isPending;
  const error = create.isError ? create.error : update.isError ? update.error : null;

  const onSave = async (draft: Task) => {
    if (isEdit) {
      await update.mutateAsync(draft as Task & { id: string });
      navigate(`/Task/${id}`);
    } else {
      const created = await create.mutateAsync(draft);
      navigate(`/Task/${created.id}`);
    }
  };

  const back = isEdit ? `/Task/${id}` : goalId ? `/Goal/${goalId}` : "/";

  return (
    <div className="space-y-4">
      <nav className="text-sm text-slate-500">
        <Link to={back} className="underline">← Back</Link>
      </nav>

      {isEdit && !existing && (
        <p className="text-sm text-slate-500">Loading task…</p>
      )}

      {(!isEdit || existing) && (
        <ResourceEditor
          resource={seed}
          saveLabel={isEdit ? "Save changes" : "Create task"}
          saving={saving}
          onCancel={() => navigate(back)}
          onSave={(draft) => onSave(draft as Task)}
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
