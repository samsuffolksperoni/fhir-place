import type {
  DomainResource,
  Reference,
  Resource,
  StructureDefinition,
} from "fhir/r4";
import { Fragment, type ReactNode } from "react";
import { useStructureDefinition } from "../hooks/queries.js";
import {
  walkObject,
  walkResource,
  type WalkedElement,
} from "../structure/walker.js";
import { Narrative } from "./Narrative.js";
import {
  defaultTypeRenderers,
  type FhirTypeRenderer,
  type RendererContext,
  type TypeRenderers,
} from "./renderers.js";

export interface ResourceViewProps {
  resource: Resource;
  /** Overrides the fetched StructureDefinition — useful for tests, profiles, or offline mode. */
  structureDefinition?: StructureDefinition;
  /** Per-type renderer overrides, merged on top of `defaultTypeRenderers`. */
  renderers?: TypeRenderers;
  /** Hide the human-readable narrative (defaults to showing it). */
  hideNarrative?: boolean;
  /** Called when a Reference is clicked. When omitted, references render as plain text. */
  onReferenceClick?: (ref: Reference) => void;
  /**
   * When provided, only top-level elements whose JSON key (e.g. `name`,
   * `birthDate`, `deceasedDateTime`) is in this list are rendered. Omit to
   * render every present element (default).
   */
  visibleFields?: string[];
  className?: string;
  profile?: string | null;
}

/**
 * Renders any FHIR resource using its StructureDefinition. Walks the SD in
 * canonical order, dispatches by datatype, and falls back to JSON for unknown
 * types. Zero resource-specific code.
 */
export function ResourceView(props: ResourceViewProps) {
  const {
    resource,
    structureDefinition,
    onReferenceClick,
    hideNarrative,
    className,
    profile,
    visibleFields,
  } = props;
  const detectedProfile = profile === undefined ? resource.meta?.profile?.[0] : profile;

  const sdQuery = useStructureDefinition({ type: resource.resourceType, profile: detectedProfile }, {
    enabled: !structureDefinition,
  });
  const sd = structureDefinition ?? sdQuery.data;

  if (!sd) {
    if (sdQuery.isError) {
      return (
        <IntrospectedView
          resource={resource}
          className={className}
          hideNarrative={hideNarrative}
          onReferenceClick={onReferenceClick}
          visibleFields={visibleFields}
        />
      );
    }
    return (
      <div className={className} data-testid="resource-view-loading">
        <p className="text-sm text-[var(--text-muted)]">
          Loading {resource.resourceType} structure…
        </p>
      </div>
    );
  }

  const renderers = { ...defaultTypeRenderers, ...props.renderers };
  const walkedAll = walkResource(sd, resource);
  const walked = visibleFields
    ? walkedAll.filter((w) => visibleFields.includes(w.key))
    : walkedAll;
  const narrative = (resource as DomainResource).text;

  return (
    <section className={className} data-testid="resource-view">
      <header className="mb-3 flex items-baseline gap-2 border-b border-[var(--border)] pb-2">
        <h2 className="text-lg font-semibold">{resource.resourceType}</h2>
        {resource.id && (
          <code className="rounded bg-[var(--sunken)] px-1 py-0.5 text-xs">{resource.id}</code>
        )}
      </header>

      {!hideNarrative && narrative?.div && (
        <details className="mb-4 rounded border border-[var(--border)] bg-[var(--surface)] p-3" open>
          <summary className="cursor-pointer text-sm font-medium text-[var(--text-muted)]">
            Narrative
          </summary>
          <Narrative narrative={narrative} className="prose prose-sm mt-2 max-w-none" />
        </details>
      )}

      <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-[minmax(8rem,1fr)_3fr] sm:gap-y-2">
        {walked.map((w) => (
          <Fragment key={w.key}>
            <dt className="font-medium text-[var(--text-muted)] sm:pt-0" title={w.path}>
              {w.label}
            </dt>
            <dd className="-mt-2 sm:mt-0">
              <ElementValue
                walked={w}
                sd={sd}
                renderers={renderers}
                onReferenceClick={onReferenceClick}
              />
            </dd>
          </Fragment>
        ))}
      </dl>
    </section>
  );
}

interface ElementValueProps {
  walked: WalkedElement;
  sd: StructureDefinition;
  renderers: TypeRenderers;
  onReferenceClick?: (ref: Reference) => void;
}

function ElementValue({ walked, sd, renderers, onReferenceClick }: ElementValueProps) {
  const { value, isArray } = walked;
  if (isArray && Array.isArray(value)) {
    if (value.length === 0) return <span className="text-[var(--text-subtle)]">—</span>;
    return (
      <ul className="space-y-1">
        {value.map((item, i) => (
          <li key={i}>
            <RenderByType
              value={item}
              walked={walked}
              sd={sd}
              renderers={renderers}
              onReferenceClick={onReferenceClick}
            />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <RenderByType
      value={value}
      walked={walked}
      sd={sd}
      renderers={renderers}
      onReferenceClick={onReferenceClick}
    />
  );
}

interface RenderByTypeProps {
  value: unknown;
  walked: WalkedElement;
  sd: StructureDefinition;
  renderers: TypeRenderers;
  onReferenceClick?: (ref: Reference) => void;
}

function RenderByType({
  value,
  walked,
  sd,
  renderers,
  onReferenceClick,
}: RenderByTypeProps): ReactNode {
  const ctx: RendererContext = {
    path: walked.path,
    typeCode: walked.typeCode,
    onReferenceClick,
  };

  const typeCode = walked.typeCode;
  if (typeCode === "BackboneElement" || typeCode === "Element") {
    return (
      <BackboneView
        sd={sd}
        parentPath={walked.path}
        value={value as Record<string, unknown>}
        renderers={renderers}
        onReferenceClick={onReferenceClick}
      />
    );
  }

  const renderer: FhirTypeRenderer | undefined = typeCode
    ? renderers[typeCode]
    : undefined;
  if (renderer) {
    return <>{renderer(value, ctx)}</>;
  }

  return (
    <pre className="overflow-x-auto rounded bg-[var(--sunken)] p-2 text-xs text-[var(--text)]">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

interface BackboneViewProps {
  sd: StructureDefinition;
  parentPath: string;
  value: Record<string, unknown>;
  renderers: TypeRenderers;
  onReferenceClick?: (ref: Reference) => void;
}

function BackboneView({
  sd,
  parentPath,
  value,
  renderers,
  onReferenceClick,
}: BackboneViewProps) {
  const children = walkObject(sd, parentPath, value);
  if (children.length === 0) {
    return (
      <pre className="overflow-x-auto rounded bg-[var(--sunken)] p-2 text-xs text-[var(--text)]">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  return (
    <dl className="grid grid-cols-1 gap-x-3 gap-y-1 border-l-2 border-[var(--border)] pl-3 sm:grid-cols-[minmax(6rem,1fr)_3fr]">
      {children.map((c) => (
        <Fragment key={c.key}>
          <dt className="text-xs font-medium text-[var(--text-muted)]" title={c.path}>
            {c.label}
          </dt>
          <dd className="text-sm">
            <ElementValue
              walked={c}
              sd={sd}
              renderers={renderers}
              onReferenceClick={onReferenceClick}
            />
          </dd>
        </Fragment>
      ))}
    </dl>
  );
}

/**
 * Schema-free fallback used when no StructureDefinition is available (server
 * doesn't store it and the library doesn't bundle one). Walks the resource's
 * own JSON shape, humanises keys, and detects common FHIR datatypes by shape
 * (Reference, CodeableConcept, HumanName, Address, Period, Identifier).
 *
 * Output is intentionally less rich than the SD-driven view — element order
 * follows JSON key order, and labels come from the keys rather than the SD's
 * `short` strings — but it lets the demo render any R4/R4B resource.
 */
const INTROSPECT_SKIP_KEYS = new Set([
  "resourceType",
  "id",
  "meta",
  "text",
  "implicitRules",
  "language",
  "contained",
]);

interface IntrospectedViewProps {
  resource: Resource;
  className?: string;
  hideNarrative?: boolean;
  onReferenceClick?: (ref: Reference) => void;
  visibleFields?: string[];
}

function IntrospectedView({
  resource,
  className,
  hideNarrative,
  onReferenceClick,
  visibleFields,
}: IntrospectedViewProps) {
  const narrative = (resource as DomainResource).text;
  const entries = Object.entries(resource as unknown as Record<string, unknown>).filter(
    ([k, v]) =>
      !INTROSPECT_SKIP_KEYS.has(k) &&
      v !== undefined &&
      v !== null &&
      (!visibleFields || visibleFields.includes(k)),
  );

  return (
    <section className={className} data-testid="resource-view-introspected">
      <header className="mb-3 flex items-baseline gap-2 border-b border-[var(--border)] pb-2">
        <h2 className="text-lg font-semibold">{resource.resourceType}</h2>
        {resource.id && (
          <code className="rounded bg-[var(--sunken)] px-1 py-0.5 text-xs">{resource.id}</code>
        )}
        <span
          className="ml-auto text-xs text-[var(--text-subtle)]"
          title="No StructureDefinition available; rendered by walking the resource JSON."
        >
          schema-free view
        </span>
      </header>

      {!hideNarrative && narrative?.div && (
        <details className="mb-4 rounded border border-[var(--border)] bg-[var(--surface)] p-3" open>
          <summary className="cursor-pointer text-sm font-medium text-[var(--text-muted)]">
            Narrative
          </summary>
          <Narrative narrative={narrative} className="prose prose-sm mt-2 max-w-none" />
        </details>
      )}

      <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-[minmax(8rem,1fr)_3fr] sm:gap-y-2">
        {entries.map(([key, value]) => (
          <Fragment key={key}>
            <dt className="font-medium text-[var(--text-muted)] sm:pt-0" title={`${resource.resourceType}.${key}`}>
              {humanizeKey(key)}
            </dt>
            <dd className="-mt-2 sm:mt-0">
              <IntrospectedValue value={value} onReferenceClick={onReferenceClick} />
            </dd>
          </Fragment>
        ))}
      </dl>
    </section>
  );
}

interface IntrospectedValueProps {
  value: unknown;
  onReferenceClick?: (ref: Reference) => void;
}

function IntrospectedValue({ value, onReferenceClick }: IntrospectedValueProps) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-[var(--text-subtle)]">—</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-[var(--text-subtle)]">—</span>;
    return (
      <ul className="space-y-1">
        {value.map((item, i) => (
          <li key={i}>
            <IntrospectedValue value={item} onReferenceClick={onReferenceClick} />
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value !== "object") {
    return <>{String(value)}</>;
  }

  const obj = value as Record<string, unknown>;

  // Reference
  if (typeof obj.reference === "string") {
    const display = (obj.display as string | undefined) ?? (obj.reference as string);
    if (onReferenceClick) {
      return (
        <button
          type="button"
          className="text-[var(--accent-text)] underline-offset-2 hover:underline"
          onClick={() => onReferenceClick(obj as Reference)}
        >
          {display}
        </button>
      );
    }
    return <>{display}</>;
  }

  // CodeableConcept
  if (typeof obj.text === "string" || Array.isArray(obj.coding)) {
    const text = (obj.text as string | undefined) ?? undefined;
    const coding = Array.isArray(obj.coding) ? (obj.coding as Array<Record<string, unknown>>) : [];
    const fromCoding = coding[0]
      ? (coding[0]!.display as string | undefined) ?? (coding[0]!.code as string | undefined)
      : undefined;
    const label = text ?? fromCoding;
    if (label) return <>{label}</>;
  }

  // HumanName
  if ("family" in obj || "given" in obj) {
    const text = obj.text as string | undefined;
    if (text) return <>{text}</>;
    const given = Array.isArray(obj.given) ? (obj.given as string[]).join(" ") : undefined;
    const family = obj.family as string | undefined;
    const joined = [given, family].filter(Boolean).join(" ");
    if (joined) return <>{joined}</>;
  }

  // Address
  if ("line" in obj || "city" in obj || "country" in obj) {
    const text = obj.text as string | undefined;
    if (text) return <>{text}</>;
    const line = Array.isArray(obj.line) ? (obj.line as string[]).join(", ") : undefined;
    const parts = [line, obj.city, obj.state, obj.postalCode, obj.country]
      .filter((p) => typeof p === "string" && p.length > 0);
    if (parts.length > 0) return <>{parts.join(", ")}</>;
  }

  // Period
  if ("start" in obj || "end" in obj) {
    const start = obj.start as string | undefined;
    const end = obj.end as string | undefined;
    if (start || end) return <>{`${start ?? "…"} – ${end ?? "…"}`}</>;
  }

  // Identifier / ContactPoint (value + optional system)
  if (typeof obj.value === "string" && (typeof obj.system === "string" || obj.system === undefined)) {
    return <>{obj.value as string}</>;
  }

  // Generic object: recurse as nested key/value list.
  const childEntries = Object.entries(obj).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (childEntries.length === 0) return <span className="text-[var(--text-subtle)]">—</span>;
  return (
    <dl className="grid grid-cols-1 gap-x-3 gap-y-1 border-l-2 border-[var(--border)] pl-3 sm:grid-cols-[minmax(6rem,1fr)_3fr]">
      {childEntries.map(([k, v]) => (
        <Fragment key={k}>
          <dt className="text-xs font-medium text-[var(--text-muted)]">{humanizeKey(k)}</dt>
          <dd className="text-sm">
            <IntrospectedValue value={v} onReferenceClick={onReferenceClick} />
          </dd>
        </Fragment>
      ))}
    </dl>
  );
}

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}
