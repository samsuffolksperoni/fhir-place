import type {
  Address,
  Annotation,
  Attachment,
  CodeableConcept,
  Coding,
  ContactPoint,
  HumanName,
  Identifier,
  Meta,
  Money,
  Period,
  Quantity,
  Range,
  Ratio,
  Reference,
} from "fhir/r4";
import type { ReactNode } from "react";

/** Context passed to every renderer. */
export interface RendererContext {
  /** Full FHIR path of the element being rendered (e.g. "Patient.name"). */
  path: string;
  /** Primary type code from the StructureDefinition. */
  typeCode: string | undefined;
  /** Callback to resolve a Reference into a link. Defaults to plain text. */
  onReferenceClick?: (ref: Reference) => void;
}

export type FhirTypeRenderer = (
  value: unknown,
  context: RendererContext,
) => ReactNode;

export type TypeRenderers = Record<string, FhirTypeRenderer>;

/* ---------- primitives ---------- */

const Primitive: FhirTypeRenderer = (value) => <span>{String(value)}</span>;
const Boolean_: FhirTypeRenderer = (value) => (
  <span className="font-mono">{value ? "true" : "false"}</span>
);
const Date_: FhirTypeRenderer = (value) => (
  <time dateTime={String(value)}>{String(value)}</time>
);
const DateTime_: FhirTypeRenderer = (value) => {
  const s = String(value);
  let formatted = s;
  try {
    formatted = new Date(s).toLocaleString();
  } catch {
    // keep raw
  }
  return <time dateTime={s}>{formatted}</time>;
};
const Code_: FhirTypeRenderer = (value) => (
  <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">{String(value)}</code>
);
const Uri_: FhirTypeRenderer = (value) => {
  const s = String(value);
  if (/^https?:\/\//i.test(s)) {
    return (
      <a className="text-blue-700 underline" href={s} target="_blank" rel="noreferrer">
        {s}
      </a>
    );
  }
  return <span className="break-all">{s}</span>;
};

/* ---------- complex datatypes ---------- */

const formatHumanName = (n: HumanName): string => {
  if (n.text) return n.text;
  const parts = [
    n.prefix?.join(" "),
    n.given?.join(" "),
    n.family,
    n.suffix?.join(" "),
  ].filter(Boolean);
  return parts.join(" ").trim();
};

const HumanNameRenderer: FhirTypeRenderer = (value) => {
  const n = value as HumanName;
  const formatted = formatHumanName(n);
  const useLabel = n.use ? ` (${n.use})` : "";
  return (
    <span>
      {formatted}
      {useLabel && <span className="text-slate-400">{useLabel}</span>}
    </span>
  );
};

const formatAddress = (a: Address): string => {
  if (a.text) return a.text;
  return [
    a.line?.join(", "),
    a.city,
    a.state,
    a.postalCode,
    a.country,
  ]
    .filter(Boolean)
    .join(", ");
};

const AddressRenderer: FhirTypeRenderer = (value) => {
  const a = value as Address;
  const label = a.use ? `${a.use} ` : "";
  return (
    <span>
      {label && <span className="text-slate-400">{label}</span>}
      {formatAddress(a)}
    </span>
  );
};

const ContactPointRenderer: FhirTypeRenderer = (value) => {
  const c = value as ContactPoint;
  if (!c.value) return <span className="text-slate-400">—</span>;
  const sys = c.system ? `${c.system}: ` : "";
  const use = c.use ? ` (${c.use})` : "";
  if (c.system === "email") {
    return (
      <span>
        <span className="text-slate-400">{sys}</span>
        <a className="text-blue-700 underline" href={`mailto:${c.value}`}>
          {c.value}
        </a>
        <span className="text-slate-400">{use}</span>
      </span>
    );
  }
  if (c.system === "phone" || c.system === "fax") {
    return (
      <span>
        <span className="text-slate-400">{sys}</span>
        <a className="text-blue-700 underline" href={`tel:${c.value}`}>
          {c.value}
        </a>
        <span className="text-slate-400">{use}</span>
      </span>
    );
  }
  return (
    <span>
      <span className="text-slate-400">{sys}</span>
      {c.value}
      <span className="text-slate-400">{use}</span>
    </span>
  );
};

const CodingRenderer: FhirTypeRenderer = (value) => {
  const c = value as Coding;
  if (c.display) {
    return (
      <span>
        {c.display}{" "}
        <code className="ml-1 rounded bg-slate-100 px-1 py-0.5 text-xs">
          {c.system ? `${c.system}#` : ""}
          {c.code}
        </code>
      </span>
    );
  }
  return (
    <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
      {c.system ? `${c.system}#` : ""}
      {c.code}
    </code>
  );
};

const CodeableConceptRenderer: FhirTypeRenderer = (value, ctx) => {
  const cc = value as CodeableConcept;
  if (cc.text) {
    return <span title={cc.coding?.map((c) => c.display ?? c.code).join(", ")}>{cc.text}</span>;
  }
  const first = cc.coding?.[0];
  if (first) return CodingRenderer(first, ctx);
  return <span className="text-slate-400">—</span>;
};

const QuantityRenderer: FhirTypeRenderer = (value) => {
  const q = value as Quantity;
  const comparator = q.comparator ?? "";
  const unit = q.unit ?? q.code ?? "";
  return (
    <span>
      {comparator}
      {q.value ?? ""}{" "}
      <span className="text-slate-500">{unit}</span>
    </span>
  );
};

const RangeRenderer: FhirTypeRenderer = (value, ctx) => {
  const r = value as Range;
  return (
    <span>
      {r.low ? QuantityRenderer(r.low, ctx) : <span className="text-slate-400">—</span>}
      <span className="mx-1 text-slate-400">to</span>
      {r.high ? QuantityRenderer(r.high, ctx) : <span className="text-slate-400">—</span>}
    </span>
  );
};

const RatioRenderer: FhirTypeRenderer = (value, ctx) => {
  const r = value as Ratio;
  return (
    <span>
      {r.numerator ? QuantityRenderer(r.numerator, ctx) : "?"}
      <span className="mx-1 text-slate-400">/</span>
      {r.denominator ? QuantityRenderer(r.denominator, ctx) : "?"}
    </span>
  );
};

const MoneyRenderer: FhirTypeRenderer = (value) => {
  const m = value as Money;
  return (
    <span>
      {m.value ?? ""} <span className="text-slate-500">{m.currency ?? ""}</span>
    </span>
  );
};

const PeriodRenderer: FhirTypeRenderer = (value) => {
  const p = value as Period;
  return (
    <span>
      <time>{p.start ?? "…"}</time>
      <span className="mx-1 text-slate-400">→</span>
      <time>{p.end ?? "…"}</time>
    </span>
  );
};

const IdentifierRenderer: FhirTypeRenderer = (value) => {
  const i = value as Identifier;
  const sys = i.system ? <span className="text-slate-400">{i.system} </span> : null;
  return (
    <span>
      {sys}
      <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">{i.value}</code>
      {i.use && <span className="ml-1 text-slate-400">({i.use})</span>}
    </span>
  );
};

const ReferenceRenderer: FhirTypeRenderer = (value, ctx) => {
  const r = value as Reference;
  const label = r.display ?? r.reference ?? "—";
  if (ctx.onReferenceClick && r.reference) {
    return (
      <button
        type="button"
        className="text-blue-700 underline"
        onClick={() => ctx.onReferenceClick?.(r)}
      >
        {label}
      </button>
    );
  }
  return <span>{label}</span>;
};

const AttachmentRenderer: FhirTypeRenderer = (value) => {
  const a = value as Attachment;
  const label = a.title ?? a.url ?? a.contentType ?? "attachment";
  if (a.url) {
    return (
      <a className="text-blue-700 underline" href={a.url} target="_blank" rel="noreferrer">
        {label}
      </a>
    );
  }
  return <span>{label}</span>;
};

const MetaRenderer: FhirTypeRenderer = (value) => {
  const m = value as Meta;
  const parts = [
    m.versionId && `v${m.versionId}`,
    m.lastUpdated,
    m.source,
  ].filter(Boolean);
  return <span className="text-slate-600">{parts.join(" · ")}</span>;
};

const AnnotationRenderer: FhirTypeRenderer = (value) => {
  const a = value as Annotation;
  return (
    <div>
      {a.authorString && (
        <span className="text-slate-400">{a.authorString}: </span>
      )}
      <span>{a.text}</span>
      {a.time && <span className="ml-2 text-slate-400">({a.time})</span>}
    </div>
  );
};

export const defaultTypeRenderers: TypeRenderers = {
  // primitives
  string: Primitive,
  boolean: Boolean_,
  integer: Primitive,
  decimal: Primitive,
  positiveInt: Primitive,
  unsignedInt: Primitive,
  date: Date_,
  dateTime: DateTime_,
  instant: DateTime_,
  time: Primitive,
  code: Code_,
  id: Code_,
  oid: Primitive,
  uuid: Primitive,
  canonical: Uri_,
  uri: Uri_,
  url: Uri_,
  markdown: Primitive,
  base64Binary: Primitive,

  // complex datatypes
  HumanName: HumanNameRenderer,
  Address: AddressRenderer,
  ContactPoint: ContactPointRenderer,
  Coding: CodingRenderer,
  CodeableConcept: CodeableConceptRenderer,
  Quantity: QuantityRenderer,
  SimpleQuantity: QuantityRenderer,
  Range: RangeRenderer,
  Ratio: RatioRenderer,
  Money: MoneyRenderer,
  Period: PeriodRenderer,
  Identifier: IdentifierRenderer,
  Reference: ReferenceRenderer,
  Attachment: AttachmentRenderer,
  Annotation: AnnotationRenderer,
  Meta: MetaRenderer,
};
