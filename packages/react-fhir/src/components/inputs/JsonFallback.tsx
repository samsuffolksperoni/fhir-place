import { baseField, type FhirTypeInput } from "./types.js";

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
