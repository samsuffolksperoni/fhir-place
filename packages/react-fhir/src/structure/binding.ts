import type { ElementDefinition, ValueSet } from "fhir/r4";

export type BindingStrength =
  | "required"
  | "extensible"
  | "preferred"
  | "example";

export interface ElementBinding {
  strength: BindingStrength | undefined;
  valueSet: string | undefined;
  description: string | undefined;
}

export function bindingFor(element: ElementDefinition | undefined): ElementBinding {
  const b = element?.binding;
  return {
    strength: b?.strength as BindingStrength | undefined,
    valueSet: b?.valueSet,
    description: b?.description,
  };
}

export interface ResolvedCode {
  system?: string;
  code: string;
  display?: string;
}

/**
 * Flatten a ValueSet to a list of codes.
 *
 * Prefers `expansion.contains` when the server pre-expanded the ValueSet (via
 * `$expand`). Falls back to `compose.include[].concept[]` when only the
 * definition is available — a minimal local expansion that covers the common
 * case of "enumerated codes inline". Does NOT resolve `compose.include.valueSet`
 * references recursively; callers needing that should call `$expand` on the server.
 */
export function codesFromValueSet(vs: ValueSet | undefined): ResolvedCode[] {
  if (!vs) return [];
  const expanded = vs.expansion?.contains;
  if (expanded && expanded.length > 0) {
    return flattenExpansion(expanded);
  }
  const includes = vs.compose?.include ?? [];
  const out: ResolvedCode[] = [];
  for (const inc of includes) {
    const system = inc.system;
    if (!inc.concept) continue;
    for (const c of inc.concept) {
      if (!c.code) continue;
      out.push({ system, code: c.code, display: c.display });
    }
  }
  return out;
}

interface ExpansionContains {
  system?: string;
  code?: string;
  display?: string;
  contains?: ExpansionContains[];
}

function flattenExpansion(nodes: ExpansionContains[]): ResolvedCode[] {
  const out: ResolvedCode[] = [];
  const stack = [...nodes];
  while (stack.length) {
    const node = stack.shift()!;
    if (node.code) {
      out.push({
        ...(node.system !== undefined ? { system: node.system } : {}),
        code: node.code,
        ...(node.display !== undefined ? { display: node.display } : {}),
      });
    }
    if (node.contains) stack.push(...node.contains);
  }
  return out;
}
