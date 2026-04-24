import {
  ResourceView,
  useDeleteResource,
  useResource,
  useUpdateResource,
} from "@fhir-place/react-fhir";
import type { Reference, Task } from "fhir/r4";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { statusPillClass } from "../helpers.js";

const NEXT_STATUS: Record<string, string | null> = {
  draft: "requested",
  requested: "accepted",
  accepted: "ready",
  ready: "in-progress",
  "in-progress": "completed",
  completed: null,
  cancelled: null,
  rejected: null,
  failed: null,
};

export function TaskDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: task, isLoading } = useResource<Task>("Task", id);
  const update = useUpdateResource<Task>();
  const del = useDeleteResource();
  const [confirming, setConfirming] = useState(false);

  const onReferenceClick = (ref: Reference) => {
    const r = ref.reference;
    if (!r) return;
    const [type, refId] = r.split("/");
    if (type && refId) navigate(`/${type}/${refId}`);
  };

  const advanceStatus = async () => {
    if (!task) return;
    const next = NEXT_STATUS[task.status!];
    if (!next) return;
    await update.mutateAsync({ ...task, id: task.id!, status: next as Task["status"] });
  };

  const cancel = async () => {
    if (!task) return;
    await update.mutateAsync({ ...task, id: task.id!, status: "cancelled" });
  };

  const handleDelete = async () => {
    await del.mutateAsync({ type: "Task", id });
    const goalRef = task?.focus?.reference;
    if (goalRef) navigate(`/${goalRef}`);
    else navigate("/");
  };

  const nextStatus = task ? NEXT_STATUS[task.status!] : null;

  return (
    <div className="space-y-4">
      <nav className="flex items-center justify-between text-sm">
        <Link
          to={task?.focus?.reference ? `/${task.focus.reference}` : "/"}
          className="text-slate-500 underline"
        >
          ← {task?.focus?.display ?? "Back"}
        </Link>
        <div className="flex gap-2">
          <Link
            to={`/Task/${id}/edit`}
            className="rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
            data-testid="edit-task"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded border border-red-300 bg-white px-3 py-1 text-xs text-red-700 hover:bg-red-50"
            data-testid="delete-task"
          >
            Delete
          </button>
        </div>
      </nav>

      {confirming && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm">
          <p className="mb-2 text-red-800">Delete this task?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded border border-slate-300 bg-white px-3 py-1 text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={del.isPending}
              data-testid="delete-task-confirm"
              className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {del.isPending ? "Deleting…" : "Yes, delete"}
            </button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-sm text-slate-500">Loading task…</p>}

      {task && (
        <>
          <section className="space-y-2 rounded border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-lg font-semibold">{task.description}</h1>
                <p className="mt-1 text-sm">
                  <span className={statusPillClass(task.status)}>{task.status}</span>{" "}
                  <span className="ml-2 text-slate-500">
                    {task.priority ?? "—"} · {task.intent}
                  </span>
                </p>
              </div>
              <div className="flex gap-2">
                {nextStatus && (
                  <button
                    type="button"
                    onClick={advanceStatus}
                    disabled={update.isPending}
                    data-testid="advance-status"
                    className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                  >
                    → {nextStatus}
                  </button>
                )}
                {task.status !== "cancelled" && task.status !== "completed" && (
                  <button
                    type="button"
                    onClick={cancel}
                    disabled={update.isPending}
                    data-testid="cancel-status"
                    className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel task
                  </button>
                )}
              </div>
            </div>
          </section>

          <ResourceView
            resource={task}
            onReferenceClick={onReferenceClick}
            className="rounded border border-slate-200 bg-white p-4 shadow-sm"
          />
        </>
      )}
    </div>
  );
}
