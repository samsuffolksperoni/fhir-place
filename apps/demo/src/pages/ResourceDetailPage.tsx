import { ResourceView, useResource } from "@fhir-place/react-fhir";
import type { Reference, Resource } from "fhir/r4";
import { Link, useNavigate, useParams } from "react-router-dom";

export function ResourceDetailPage() {
  const { resourceType = "", id = "" } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useResource<Resource>(resourceType, id);

  const onReferenceClick = (ref: Reference) => {
    const r = ref.reference;
    if (!r) return;
    if (/^https?:\/\//i.test(r)) {
      window.open(r, "_blank", "noopener,noreferrer");
      return;
    }
    const [type, refId] = r.split("/");
    if (type && refId) navigate(`/${type}/${refId}`);
  };

  return (
    <div className="space-y-4">
      <nav className="text-sm text-slate-500">
        <Link to="/Patient" className="underline">
          ← All patients
        </Link>
      </nav>

      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {isError && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {(error as Error)?.message}
        </p>
      )}
      {data && (
        <ResourceView
          resource={data}
          onReferenceClick={onReferenceClick}
          className="rounded border border-slate-200 bg-white p-4 shadow-sm"
        />
      )}
    </div>
  );
}
