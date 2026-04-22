export type PathSegment = string | number;
export type Path = readonly PathSegment[];

/** Reads the value at a path. Returns undefined for any missing segment. */
export function pathGet(obj: unknown, path: Path): unknown {
  let cur: unknown = obj;
  for (const seg of path) {
    if (cur === null || cur === undefined) return undefined;
    cur = (cur as Record<PathSegment, unknown>)[seg];
  }
  return cur;
}

/**
 * Immutably sets the value at a path, creating intermediate containers as
 * needed. A numeric segment forces an array container; a string segment forces
 * an object container.
 */
export function pathSet<T>(obj: T, path: Path, value: unknown): T {
  if (path.length === 0) return value as T;
  const [head, ...rest] = path;
  if (typeof head === "number") {
    const source = Array.isArray(obj) ? (obj as unknown[]) : [];
    const next = [...source];
    next[head] = pathSet(next[head], rest, value);
    return next as unknown as T;
  }
  const source =
    obj && typeof obj === "object" ? (obj as Record<string, unknown>) : {};
  return {
    ...source,
    [head!]: pathSet(source[head!], rest, value),
  } as T;
}

/** Immutably removes the value at a path. Array indices collapse the array. */
export function pathRemove<T>(obj: T, path: Path): T {
  if (path.length === 0) return obj;
  if (path.length === 1) {
    const [head] = path;
    if (typeof head === "number" && Array.isArray(obj)) {
      return (obj as unknown[]).filter((_, i) => i !== head) as unknown as T;
    }
    if (typeof head === "string" && obj && typeof obj === "object") {
      const { [head]: _removed, ...rest } = obj as Record<string, unknown>;
      return rest as T;
    }
    return obj;
  }
  const [head, ...rest] = path;
  if (typeof head === "number") {
    if (!Array.isArray(obj)) return obj;
    const next = [...(obj as unknown[])];
    next[head] = pathRemove(next[head], rest);
    return next as unknown as T;
  }
  if (!obj || typeof obj !== "object") return obj;
  const source = obj as Record<string, unknown>;
  return {
    ...source,
    [head!]: pathRemove(source[head!], rest),
  } as T;
}

/** Remove keys whose value is `undefined`, an empty object, or an empty array. */
export function prune<T>(obj: T): T {
  if (Array.isArray(obj)) {
    const cleaned = obj
      .map((v) => prune(v))
      .filter((v) => v !== undefined && !isEmpty(v));
    return cleaned as unknown as T;
  }
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      const pv = prune(v);
      if (pv === undefined || isEmpty(pv)) continue;
      out[k] = pv;
    }
    return out as T;
  }
  return obj;
}

const isEmpty = (v: unknown): boolean => {
  if (v === "" || v === null) return true;
  if (Array.isArray(v)) return v.length === 0;
  if (v && typeof v === "object") return Object.keys(v).length === 0;
  return false;
};
