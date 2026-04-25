import type { ElementDefinition } from "fhir/r4";
import type { ReactNode } from "react";

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

/**
 * Tailwind class shared by every input. Centralised so a future theme switch
 * (or `className` prop on `<ResourceEditor>`) only needs to update one place.
 */
export const baseField =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none";

export const subLabel = "mb-1 block text-xs font-medium text-slate-500";
export const subRow = "grid grid-cols-1 gap-2 sm:grid-cols-2";
