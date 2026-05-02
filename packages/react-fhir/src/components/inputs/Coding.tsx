import type { Coding } from "fhir/r4";
import { useValueSet } from "../../hooks/queries.js";
import { bindingFor, codesFromValueSet } from "../../structure/binding.js";
import {
  baseField,
  subLabel,
  type FhirInputProps,
  type FhirTypeInput,
} from "./types.js";

/**
 * Three-input free-form Coding editor (system/code/display). Used as the
 * fallback when the bound element has no resolvable ValueSet.
 */
const FreeFormCoding = ({
  value,
  onChange,
}: Pick<FhirInputProps<Coding>, "value" | "onChange">) => {
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

/**
 * Coding editor that follows the same binding-driven pattern as `CodeInput`:
 *
 *   1. If the element binds a ValueSet, fetch it via `useValueSet` and render
 *      a `<select>` of the contained concepts. Picking one writes a full
 *      `{ system, code, display }` triple.
 *   2. Required bindings lock to the enumeration; extensible/preferred also
 *      offer an "Other…" option that exposes the free-form 3-input editor for
 *      any pre-existing custom value (matching `CodeInput`'s UX).
 *   3. With no usable binding, falls back to the free-form 3-input editor.
 */
export const CodingInput: FhirTypeInput<Coding> = ({
  value,
  onChange,
  context,
}) => {
  const v = value ?? {};
  const { strength, valueSet } = bindingFor(context.element);
  const { data: vs, isLoading } = useValueSet(valueSet);
  const boundCodes = codesFromValueSet(vs);
  const fieldName = context.element.path?.split(".").pop() ?? "coding";

  if (boundCodes.length === 0) {
    if (valueSet && isLoading) {
      return (
        <input
          aria-label={fieldName}
          className={baseField}
          value=""
          readOnly
          placeholder="Loading value set…"
        />
      );
    }
    return <FreeFormCoding value={value} onChange={onChange} />;
  }

  const keyOf = (system: string | undefined, code: string) =>
    `${system ?? ""}|${code}`;
  const options = boundCodes.map((c) => ({
    ...c,
    key: keyOf(c.system, c.code),
    label: c.display ? `${c.display} (${c.code})` : c.code,
  }));

  const allowFreeText = strength !== "required";
  const currentKey = v.code !== undefined ? keyOf(v.system, v.code) : "";
  const matchedOption = options.find((o) => o.key === currentKey);
  const usingFreeText = allowFreeText && v.code !== undefined && !matchedOption;

  return (
    <div className="space-y-2">
      <select
        aria-label={fieldName}
        className={baseField}
        value={usingFreeText ? "__other__" : matchedOption?.key ?? ""}
        onChange={(e) => {
          const k = e.target.value;
          if (k === "__other__") return; // keep current free-text value
          if (k === "") {
            onChange(undefined);
            return;
          }
          const picked = options.find((o) => o.key === k);
          if (!picked) return;
          onChange({
            ...(picked.system !== undefined ? { system: picked.system } : {}),
            code: picked.code,
            ...(picked.display !== undefined
              ? { display: picked.display }
              : {}),
          });
        }}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
        {allowFreeText && <option value="__other__">Other…</option>}
      </select>
      {usingFreeText && <FreeFormCoding value={value} onChange={onChange} />}
    </div>
  );
};
