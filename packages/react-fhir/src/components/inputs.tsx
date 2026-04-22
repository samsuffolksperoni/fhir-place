import type {
  Address,
  CodeableConcept,
  Coding,
  ContactPoint,
  ElementDefinition,
  HumanName,
  Identifier,
  Period,
  Quantity,
  Reference,
} from "fhir/r4";
import type { ReactNode } from "react";
import { useValueSet } from "../hooks/queries.js";
import { bindingFor, codesFromValueSet } from "../structure/binding.js";
import { ReferencePicker, ReferencePickerFallback } from "./ReferencePicker.js";

export interface InputContext {
  path: string;
  typeCode: string | undefined;
  element: ElementDefinition;
}

export interface FhirInputProps<T = unknown> {
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  context: InputContext;
}

export type FhirTypeInput<T = unknown> = (props: FhirInputProps<T>) => ReactNode;
export type TypeInputs = Record<string, FhirTypeInput>;

const baseField =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none";

/* ---------- primitive inputs ---------- */

const TextInput: FhirTypeInput<string> = ({ value, onChange }) => (
  <input
    type="text"
    className={baseField}
    value={value ?? ""}
    onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
  />
);

const MarkdownInput: FhirTypeInput<string> = ({ value, onChange }) => (
  <textarea
    rows={3}
    className={baseField}
    value={value ?? ""}
    onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
  />
);

const BooleanInput: FhirTypeInput<boolean> = ({ value, onChange }) => (
  <label className="inline-flex items-center gap-2 text-sm">
    <input
      type="checkbox"
      checked={Boolean(value)}
      onChange={(e) => onChange(e.target.checked ? true : undefined)}
    />
    <span className="text-slate-500">{value ? "true" : "false"}</span>
  </label>
);

const NumberInput: FhirTypeInput<number> = ({ value, onChange, context }) => {
  const step = context.typeCode === "decimal" ? "any" : "1";
  return (
    <input
      type="number"
      step={step}
      className={baseField}
      value={value === undefined || value === null ? "" : String(value)}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "") return onChange(undefined);
        const n = Number(v);
        onChange(Number.isNaN(n) ? undefined : n);
      }}
    />
  );
};

const DateInput: FhirTypeInput<string> = ({ value, onChange }) => (
  <input
    type="date"
    className={baseField}
    value={value ?? ""}
    onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
  />
);

const DateTimeInput: FhirTypeInput<string> = ({ value, onChange }) => {
  // <input type="datetime-local"> expects "YYYY-MM-DDTHH:mm" (no timezone).
  // FHIR accepts ISO-8601 with timezone; we convert on the fly.
  const localValue = value ? value.slice(0, 16) : "";
  return (
    <input
      type="datetime-local"
      className={baseField}
      value={localValue}
      onChange={(e) => {
        if (e.target.value === "") return onChange(undefined);
        // preserve timezone Z if we can't infer otherwise
        onChange(new Date(e.target.value).toISOString());
      }}
    />
  );
};

const TimeInput: FhirTypeInput<string> = ({ value, onChange }) => (
  <input
    type="time"
    step="1"
    className={baseField}
    value={value ?? ""}
    onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
  />
);

const UriInput: FhirTypeInput<string> = ({ value, onChange }) => (
  <input
    type="url"
    className={baseField}
    value={value ?? ""}
    onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
  />
);

/**
 * Resolves a `code` element's binding to a list of acceptable values:
 *   1. If binding.valueSet is set, fetch it via useValueSet and use its codes.
 *   2. Fallback: parse pipe-separated enumeration out of element.short.
 *   3. Last resort: plain text input.
 *
 * Required bindings lock to the enumeration; extensible / preferred also
 * allow a free-text "other" entry.
 */
const CodeInput: FhirTypeInput<string> = (props) => {
  const { element } = props.context;
  const short = element.short;
  const fieldName = element.path?.split(".").pop() ?? "code";
  const { strength, valueSet } = bindingFor(element);

  const { data: vs, isLoading } = useValueSet(valueSet);
  const boundCodes = codesFromValueSet(vs);

  const options: Array<{ value: string; label: string }> = [];
  if (boundCodes.length > 0) {
    for (const c of boundCodes) {
      options.push({ value: c.code, label: c.display ? `${c.display} (${c.code})` : c.code });
    }
  } else if (short && short.includes("|")) {
    for (const raw of short.split("|")) {
      const v = raw.trim();
      if (v) options.push({ value: v, label: v });
    }
  }

  if (options.length === 0) {
    if (valueSet && isLoading) {
      return (
        <input
          aria-label={fieldName}
          className={baseField}
          value={props.value ?? ""}
          readOnly
          placeholder="Loading value set…"
        />
      );
    }
    return <TextInput {...(props as FhirInputProps<string>)} />;
  }

  const allowFreeText = strength !== "required";
  const currentValue = props.value ?? "";
  const valueMatches = options.some((o) => o.value === currentValue);
  const usingFreeText = !valueMatches && currentValue !== "";

  return (
    <div className="flex gap-1">
      <select
        aria-label={fieldName}
        className={baseField}
        value={usingFreeText ? "__other__" : currentValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "__other__") return; // keep free-text input value
          props.onChange(v === "" ? undefined : v);
        }}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        {allowFreeText && <option value="__other__">Other…</option>}
      </select>
      {allowFreeText && usingFreeText && (
        <input
          aria-label={`${fieldName} (custom)`}
          className={baseField}
          value={currentValue}
          onChange={(e) =>
            props.onChange(e.target.value === "" ? undefined : e.target.value)
          }
        />
      )}
    </div>
  );
};

/* ---------- complex-type sub-forms ---------- */

const subLabel = "mb-1 block text-xs font-medium text-slate-500";
const subRow = "grid grid-cols-1 gap-2 sm:grid-cols-2";

const HumanNameInput: FhirTypeInput<HumanName> = ({ value, onChange }) => {
  const v = value ?? {};
  const patch = (k: keyof HumanName, val: unknown) => {
    const next = { ...v, [k]: val };
    onChange(val === undefined || val === "" ? (Object.keys(next).length ? next : undefined) : next);
  };
  return (
    <div className="space-y-2 rounded border border-slate-200 bg-slate-50 p-2">
      <div className={subRow}>
        <label>
          <span className={subLabel}>Given (comma-separated)</span>
          <input
            className={baseField}
            value={v.given?.join(", ") ?? ""}
            onChange={(e) =>
              patch(
                "given",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
          />
        </label>
        <label>
          <span className={subLabel}>Family</span>
          <input
            className={baseField}
            value={v.family ?? ""}
            onChange={(e) => patch("family", e.target.value || undefined)}
          />
        </label>
      </div>
      <label>
        <span className={subLabel}>Use</span>
        <select
          className={baseField}
          value={v.use ?? ""}
          onChange={(e) => patch("use", e.target.value || undefined)}
        >
          <option value="">—</option>
          {["usual", "official", "temp", "nickname", "anonymous", "old", "maiden"].map(
            (u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ),
          )}
        </select>
      </label>
    </div>
  );
};

const AddressInput: FhirTypeInput<Address> = ({ value, onChange }) => {
  const v = value ?? {};
  const patch = (k: keyof Address, val: unknown) =>
    onChange({ ...v, [k]: val });
  return (
    <div className="space-y-2 rounded border border-slate-200 bg-slate-50 p-2">
      <label>
        <span className={subLabel}>Line (comma-separated)</span>
        <input
          className={baseField}
          value={v.line?.join(", ") ?? ""}
          onChange={(e) =>
            patch(
              "line",
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        />
      </label>
      <div className={subRow}>
        <label>
          <span className={subLabel}>City</span>
          <input
            className={baseField}
            value={v.city ?? ""}
            onChange={(e) => patch("city", e.target.value || undefined)}
          />
        </label>
        <label>
          <span className={subLabel}>Postal code</span>
          <input
            className={baseField}
            value={v.postalCode ?? ""}
            onChange={(e) => patch("postalCode", e.target.value || undefined)}
          />
        </label>
        <label>
          <span className={subLabel}>State</span>
          <input
            className={baseField}
            value={v.state ?? ""}
            onChange={(e) => patch("state", e.target.value || undefined)}
          />
        </label>
        <label>
          <span className={subLabel}>Country</span>
          <input
            className={baseField}
            value={v.country ?? ""}
            onChange={(e) => patch("country", e.target.value || undefined)}
          />
        </label>
      </div>
    </div>
  );
};

const ContactPointInput: FhirTypeInput<ContactPoint> = ({ value, onChange }) => {
  const v = value ?? {};
  const patch = (k: keyof ContactPoint, val: unknown) =>
    onChange({ ...v, [k]: val });
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[8rem_1fr_8rem]">
        <select
          className={baseField}
          value={v.system ?? ""}
          onChange={(e) => patch("system", e.target.value || undefined)}
        >
          <option value="">system</option>
          {["phone", "fax", "email", "pager", "url", "sms", "other"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          className={baseField}
          placeholder="value"
          value={v.value ?? ""}
          onChange={(e) => patch("value", e.target.value || undefined)}
        />
        <select
          className={baseField}
          value={v.use ?? ""}
          onChange={(e) => patch("use", e.target.value || undefined)}
        >
          <option value="">use</option>
          {["home", "work", "temp", "old", "mobile"].map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

const IdentifierInput: FhirTypeInput<Identifier> = ({ value, onChange }) => {
  const v = value ?? {};
  const patch = (k: keyof Identifier, val: unknown) =>
    onChange({ ...v, [k]: val });
  return (
    <div className="grid grid-cols-1 gap-2 rounded border border-slate-200 bg-slate-50 p-2 sm:grid-cols-2">
      <label>
        <span className={subLabel}>System</span>
        <input
          className={baseField}
          value={v.system ?? ""}
          onChange={(e) => patch("system", e.target.value || undefined)}
        />
      </label>
      <label>
        <span className={subLabel}>Value</span>
        <input
          className={baseField}
          value={v.value ?? ""}
          onChange={(e) => patch("value", e.target.value || undefined)}
        />
      </label>
    </div>
  );
};

/**
 * Prefers the search-and-pick ReferencePicker when the ElementDefinition
 * advertises allowed `targetProfile`s. Falls back to the raw Reference/display
 * text inputs when targets can't be derived (e.g. `Reference(Any)`).
 */
const ReferenceInput: FhirTypeInput<Reference> = ({ value, onChange, context }) => {
  const targets = targetTypesFromElement(context.element);
  if (targets.length > 0) {
    return <ReferencePicker targets={targets} value={value} onChange={onChange} />;
  }
  return <ReferencePickerFallback value={value} onChange={onChange} />;
};

const targetTypesFromElement = (element: ElementDefinition): string[] => {
  const refType = element.type?.find((t) => t.code === "Reference");
  const profiles = refType?.targetProfile ?? [];
  return profiles
    .map((p) => p.split("/").pop() ?? "")
    .filter(Boolean)
    .filter((t) => t !== "Resource"); // Reference(Any) → empty, fall back to manual
};

const PeriodInput: FhirTypeInput<Period> = ({ value, onChange }) => {
  const v = value ?? {};
  const patch = (k: keyof Period, val: unknown) =>
    onChange({ ...v, [k]: val });
  return (
    <div className="grid grid-cols-1 gap-2 rounded border border-slate-200 bg-slate-50 p-2 sm:grid-cols-2">
      <label>
        <span className={subLabel}>Start</span>
        <input
          type="datetime-local"
          className={baseField}
          value={v.start?.slice(0, 16) ?? ""}
          onChange={(e) =>
            patch(
              "start",
              e.target.value ? new Date(e.target.value).toISOString() : undefined,
            )
          }
        />
      </label>
      <label>
        <span className={subLabel}>End</span>
        <input
          type="datetime-local"
          className={baseField}
          value={v.end?.slice(0, 16) ?? ""}
          onChange={(e) =>
            patch(
              "end",
              e.target.value ? new Date(e.target.value).toISOString() : undefined,
            )
          }
        />
      </label>
    </div>
  );
};

const QuantityInput: FhirTypeInput<Quantity> = ({ value, onChange }) => {
  const v = value ?? {};
  const patch = (k: keyof Quantity, val: unknown) =>
    onChange({ ...v, [k]: val });
  return (
    <div className="grid grid-cols-1 gap-2 rounded border border-slate-200 bg-slate-50 p-2 sm:grid-cols-[6rem_1fr_8rem]">
      <label>
        <span className={subLabel}>Value</span>
        <input
          type="number"
          step="any"
          className={baseField}
          value={v.value === undefined ? "" : v.value}
          onChange={(e) =>
            patch(
              "value",
              e.target.value === "" ? undefined : Number(e.target.value),
            )
          }
        />
      </label>
      <label>
        <span className={subLabel}>Unit</span>
        <input
          className={baseField}
          value={v.unit ?? ""}
          onChange={(e) => patch("unit", e.target.value || undefined)}
        />
      </label>
      <label>
        <span className={subLabel}>UCUM code</span>
        <input
          className={baseField}
          value={v.code ?? ""}
          onChange={(e) => patch("code", e.target.value || undefined)}
        />
      </label>
    </div>
  );
};

const CodingInput: FhirTypeInput<Coding> = ({ value, onChange }) => {
  const v = value ?? {};
  const patch = (k: keyof Coding, val: unknown) => onChange({ ...v, [k]: val });
  return (
    <div className="grid grid-cols-1 gap-2 rounded border border-slate-200 bg-slate-50 p-2 sm:grid-cols-3">
      <label>
        <span className={subLabel}>System</span>
        <input
          className={baseField}
          value={v.system ?? ""}
          onChange={(e) => patch("system", e.target.value || undefined)}
        />
      </label>
      <label>
        <span className={subLabel}>Code</span>
        <input
          className={baseField}
          value={v.code ?? ""}
          onChange={(e) => patch("code", e.target.value || undefined)}
        />
      </label>
      <label>
        <span className={subLabel}>Display</span>
        <input
          className={baseField}
          value={v.display ?? ""}
          onChange={(e) => patch("display", e.target.value || undefined)}
        />
      </label>
    </div>
  );
};

const CodeableConceptInput: FhirTypeInput<CodeableConcept> = ({
  value,
  onChange,
  context,
}) => {
  const v = value ?? {};
  const firstCoding = v.coding?.[0];
  return (
    <div className="space-y-2 rounded border border-slate-200 bg-slate-50 p-2">
      <label>
        <span className={subLabel}>Text</span>
        <input
          className={baseField}
          value={v.text ?? ""}
          onChange={(e) =>
            onChange({ ...v, text: e.target.value || undefined })
          }
        />
      </label>
      <div>
        <span className={subLabel}>Coding</span>
        <CodingInput
          value={firstCoding}
          onChange={(coding) =>
            onChange({
              ...v,
              coding: coding ? [coding] : [],
            })
          }
          context={context}
        />
      </div>
    </div>
  );
};

export const defaultTypeInputs: TypeInputs = {
  // primitives
  string: TextInput as FhirTypeInput,
  markdown: MarkdownInput as FhirTypeInput,
  boolean: BooleanInput as FhirTypeInput,
  integer: NumberInput as FhirTypeInput,
  positiveInt: NumberInput as FhirTypeInput,
  unsignedInt: NumberInput as FhirTypeInput,
  decimal: NumberInput as FhirTypeInput,
  date: DateInput as FhirTypeInput,
  dateTime: DateTimeInput as FhirTypeInput,
  instant: DateTimeInput as FhirTypeInput,
  time: TimeInput as FhirTypeInput,
  code: CodeInput as FhirTypeInput,
  id: TextInput as FhirTypeInput,
  oid: TextInput as FhirTypeInput,
  uuid: TextInput as FhirTypeInput,
  uri: UriInput as FhirTypeInput,
  url: UriInput as FhirTypeInput,
  canonical: UriInput as FhirTypeInput,
  base64Binary: TextInput as FhirTypeInput,

  // complex
  HumanName: HumanNameInput as FhirTypeInput,
  Address: AddressInput as FhirTypeInput,
  ContactPoint: ContactPointInput as FhirTypeInput,
  Identifier: IdentifierInput as FhirTypeInput,
  Reference: ReferenceInput as FhirTypeInput,
  Period: PeriodInput as FhirTypeInput,
  Quantity: QuantityInput as FhirTypeInput,
  SimpleQuantity: QuantityInput as FhirTypeInput,
  Coding: CodingInput as FhirTypeInput,
  CodeableConcept: CodeableConceptInput as FhirTypeInput,
};

/** JSON-textarea fallback for datatypes the library doesn't have a built-in input for. */
export const JsonFallbackInput: FhirTypeInput = ({ value, onChange }) => {
  const text = value === undefined ? "" : JSON.stringify(value, null, 2);
  return (
    <textarea
      rows={5}
      className={`${baseField} font-mono text-xs`}
      value={text}
      onChange={(e) => {
        if (e.target.value === "") {
          onChange(undefined);
          return;
        }
        try {
          onChange(JSON.parse(e.target.value));
        } catch {
          // leave the previous value intact; user is mid-edit
        }
      }}
    />
  );
};
