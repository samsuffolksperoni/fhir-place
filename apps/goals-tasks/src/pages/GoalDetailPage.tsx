import {
  ResourceView,
  useDeleteResource,
  useResource,
  useSearch,
} from "@fhir-place/react-fhir";
import type { Goal, Reference, Task } from "fhir/r4";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { statusPillClass } from "../helpers.js";

export function GoalDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: goal, isLoading } = useResource<Goal>("Goal", id);
  const { data: taskBundle } = useSearch<Task>("Task", { focus: `Goal/${id}` });
  const del = useDeleteResource();
  const [confirming, setConfirming] = useState(false);

  const tasks = taskBundle?.entry?.flatMap((e) => (e.resource ? [e.resource] : [])) ?? [];

  const onReferenceClick = (ref: Reference) => {
    const r = ref.reference;
    if (!r) return;
    const [type, refId] = r.split("/");
    if (type && refId) navigate(`/${type}/${refId}`);
  };

  const handleDelete = async () => {
    await del.mutateAsync({ type: "Goal", id });
    navigate("/");
  };

  return (
    <div className="space-y-4">
      <nav className="flex items-center justify-between text-sm">
        <Link to="/" className="text-slate-500 underline">
          ← Back to patient
        </Link>
        <div className="flex gap-2">
          <Link
            to={`/Goal/${id}/edit`}
            className="rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
            data-testid="edit-goal"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded border border-red-300 bg-white px-3 py-1 text-xs text-red-700 hover:bg-red-50"
            data-testid="delete-goal"
          >
            Delete
          </button>
        </div>
      </nav>

      {confirming && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm">
          <p className="mb-2 text-red-800">
            Delete this goal? Any tasks referencing it will keep their references,
            but the goal itself will be gone.
          </p>
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
              data-testid="delete-goal-confirm"
              className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {del.isPending ? "Deleting…" : "Yes, delete"}
            </button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-sm text-slate-500">Loading goal…</p>}

      {goal && (
        <ResourceView
          resource={goal}
          onReferenceClick={onReferenceClick}
          className="rounded border border-slate-200 bg-white p-4 shadow-sm"
        />
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Tasks for this goal</h2>
          <Link
            to={`/Task/new?goal=${id}`}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            data-testid="new-task"
          >
            + New task
          </Link>
        </div>

        <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
          {tasks.map((t) => (
            <li key={t.id} data-testid="task-row">
              <Link
                to={`/Task/${t.id}`}
                className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-50 sm:flex-row sm:items-baseline sm:justify-between"
              >
                <span className="font-medium text-slate-900">
                  {t.description ?? "(no description)"}
                </span>
                <span className="flex items-baseline gap-2 text-xs text-slate-500">
                  <span className={statusPillClass(t.status)}>{t.status}</span>
                  <span>{t.priority ?? "—"}</span>
                </span>
              </Link>
            </li>
          ))}
          {tasks.length === 0 && taskBundle && (
            <li className="px-4 py-6 text-center text-sm text-slate-500">
              No tasks yet — <Link to={`/Task/new?goal=${id}`} className="underline">add one</Link>.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
