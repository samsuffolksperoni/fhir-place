import type { Reference, Resource, StructureDefinition } from "fhir/r4";
import { Fragment, useMemo, type ReactNode } from "react";
import { useStructureDefinition } from "../hooks/queries.js";
import { findChoiceVariant, findElement } from "../structure/walker.js";
import {
  defaultTypeRenderers,
  type RendererContext,
  type TypeRenderers,
} from "./renderers.js";

export interface ResourceTableSort {
  by: string;
  direction: "asc" | "desc";
}

export interface ResourceTableProps<T extends Resource = Resource> {
  resources: T[];
  /** Dotted FHIR paths to show as columns, e.g. `["status", "code.text", "subject.display"]`. */
  columns: string[];
  /** Override the default cell renderer for specific column paths. */
  cellRenderers?: Record<string, (resource: T) => ReactNode>;
  /** Override column header labels (defaults to the StructureDefinition element's `short`). */
  columnLabels?: Record<string, string>;
  /** Row click handler — when present, rows become clickable (keyboard accessible). */
  onRowClick?: (resource: T) => void;
  /** Controlled sort state. When set, header cells become sort triggers. */
  sort?: ResourceTableSort;
  onSortChange?: (sort: ResourceTableSort) => void;
  emptyState?: ReactNode;
  /** When provided, overrides the fetched StructureDefinition (useful for tests / profiles). */
  structureDefinition?: StructureDefinition;
  /** Merged on top of `defaultTypeRenderers` for cell formatting. */
  renderers?: TypeRenderers;
  /** Click handler for Reference cells. */
  onReferenceClick?: (ref: Reference) => void;
  className?: string;
}

const headerFromPath = (path: string): string => {
  // Always use the last path segment as the column header. Element.short
  // descriptions from a StructureDefinition are long sentence fragments that
  // read badly as table headers ("Who the condition is about" → just "Subject").
  const last = path.split(".").pop() ?? path;
  return last
    .replace(/\[\d+\]/g, "")
    .replace(/\[x\]$/, "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
};

export function getByPath(obj: unknown, path: string): unknown {
  if (!obj) return undefined;
  let cur: unknown = obj;
  for (const segment of path.split(".")) {
    if (cur === null || cur === undefined) return undefined;
    // Support "coding[0]" segments by resolving the index separately.
    const match = segment.match(/^(\w+)\[(\d+)\]$/);
    if (match) {
      cur = (cur as Record<string, unknown>)[match[1]!];
      if (Array.isArray(cur)) cur = cur[Number(match[2])];
    } else {
      cur = (cur as Record<string, unknown>)[segment];
      if (Array.isArray(cur)) cur = cur[0]; // auto-pick first item for non-indexed segments
    }
  }
  return cur;
}

/**
 * Generic table driven by the StructureDefinition's datatype metadata. Cells
 * format using the same `defaultTypeRenderers` map as `<ResourceView>`, so a
 * CodeableConcept in a table cell and in a detail page render identically.
 */
export function ResourceTable<T extends Resource = Resource>({
  resources,
  columns,
  cellRenderers,
  columnLabels,
  onRowClick,
  sort,
  onSortChange,
  emptyState,
  structureDefinition,
  renderers: rendererOverrides,
  onReferenceClick,
  className,
}: ResourceTableProps<T>) {
  const resourceType = resources[0]?.resourceType ?? "";
  const sdQuery = useStructureDefinition(resourceType, {
    enabled: !structureDefinition && Boolean(resourceType),
  });
  const sd = structureDefinition ?? sdQuery.data;

  const headers = useMemo(
    () =>
      columns.map((path) => {
        const label = columnLabels?.[path];
        if (label) return { path, label, typeCode: typeForPath(sd, resourceType, path) };
        return {
          path,
          label: headerFromPath(path),
          typeCode: typeForPath(sd, resourceType, path),
        };
      }),
    [columns, columnLabels, sd, resourceType],
  );

  const renderers: TypeRenderers = { ...defaultTypeRenderers, ...rendererOverrides };

  const toggleSort = (by: string) => {
    if (!onSortChange) return;
    const direction: "asc" | "desc" =
      sort?.by === by && sort.direction === "asc" ? "desc" : "asc";
    onSortChange({ by, direction });
  };

  if (resources.length === 0) {
    return <>{emptyState ?? <p className="text-sm text-slate-500">No results.</p>}</>;
  }

  return (
    <div className={className ?? "overflow-x-auto rounded border border-slate-200 bg-white"} data-testid="resource-table">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left">
          <tr>
            {headers.map((h) => (
              <th key={h.path} className="px-3 py-2 font-medium text-slate-600">
                {onSortChange ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(h.path)}
                    className="flex items-center gap-1 hover:text-slate-900"
                  >
                    {h.label}
                    {sort?.by === h.path && (
                      <span aria-hidden className="text-[10px]">
                        {sort.direction === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </button>
                ) : (
                  h.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {resources.map((r) => (
            <tr
              key={`${r.resourceType}/${r.id}`}
              className={onRowClick ? "cursor-pointer hover:bg-slate-50" : undefined}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick(r);
                      }
                    }
                  : undefined
              }
              tabIndex={onRowClick ? 0 : undefined}
              data-testid="resource-row"
            >
              {headers.map((h) => (
                <Fragment key={h.path}>
                  <td className="px-3 py-2 align-top">
                    {renderCell({
                      resource: r,
                      path: h.path,
                      typeCode: h.typeCode,
                      cellRenderers,
                      renderers,
                      onReferenceClick,
                    })}
                  </td>
                </Fragment>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function typeForPath(
  sd: StructureDefinition | undefined,
  base: string,
  path: string,
): string | undefined {
  if (!sd) return undefined;
  // Strip any [index] segments and numeric indices for the SD lookup.
  const cleaned = path.replace(/\[\d+\]/g, "").replace(/\.\d+$/g, "");
  const fullPath = `${base}.${cleaned}`;
  const el = findElement(sd, fullPath);
  if (el?.type?.[0]?.code) return el.type[0].code;
  // The path may be a materialised choice variant (e.g. `valueQuantity` for
  // `Observation.value[x]`) — resolve via the choice element so cells like the
  // Observation Value column dispatch to the Quantity renderer rather than the
  // JSON fallback.
  return findChoiceVariant(sd, fullPath)?.typeCode;
}

interface RenderCellParams<T extends Resource> {
  resource: T;
  path: string;
  typeCode: string | undefined;
  cellRenderers?: Record<string, (r: T) => ReactNode>;
  renderers: TypeRenderers;
  onReferenceClick?: (ref: Reference) => void;
}

function renderCell<T extends Resource>({
  resource,
  path,
  typeCode,
  cellRenderers,
  renderers,
  onReferenceClick,
}: RenderCellParams<T>): ReactNode {
  const custom = cellRenderers?.[path];
  if (custom) return custom(resource);

  const value = getByPath(resource, path);
  if (value === undefined || value === null || value === "") {
    return <span className="text-slate-400">—</span>;
  }

  const ctx: RendererContext = {
    path,
    typeCode,
    ...(onReferenceClick ? { onReferenceClick } : {}),
  };

  const renderer = typeCode ? renderers[typeCode] : undefined;
  if (renderer) return <>{renderer(value, ctx)}</>;

  // Fallback for unknown types or plain primitives.
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return <span>{String(value)}</span>;
  }
  return (
    <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
      {JSON.stringify(value).slice(0, 60)}
    </code>
  );
}
