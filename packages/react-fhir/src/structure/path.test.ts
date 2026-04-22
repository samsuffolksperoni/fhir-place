import { describe, expect, it } from "vitest";
import { pathGet, pathRemove, pathSet, prune } from "./path.js";

describe("pathGet", () => {
  it("reads a nested value", () => {
    expect(pathGet({ a: { b: [1, 2, 3] } }, ["a", "b", 1])).toBe(2);
  });
  it("returns undefined for missing segments", () => {
    expect(pathGet({ a: 1 }, ["a", "b", "c"])).toBeUndefined();
    expect(pathGet(null, ["a"])).toBeUndefined();
  });
  it("returns the original object for an empty path", () => {
    const o = { a: 1 };
    expect(pathGet(o, [])).toBe(o);
  });
});

describe("pathSet", () => {
  it("sets a new top-level key immutably", () => {
    const o = { a: 1 };
    const next = pathSet(o, ["b"], 2);
    expect(next).toEqual({ a: 1, b: 2 });
    expect(o).toEqual({ a: 1 });
  });

  it("creates intermediate objects and arrays as needed", () => {
    const next = pathSet({}, ["a", 0, "b"], 42);
    expect(next).toEqual({ a: [{ b: 42 }] });
  });

  it("updates an array element without mutating the source array", () => {
    const o = { xs: [1, 2, 3] };
    const next = pathSet(o, ["xs", 1], 99);
    expect(next).toEqual({ xs: [1, 99, 3] });
    expect(o.xs).toEqual([1, 2, 3]);
  });

  it("replaces the whole object when given an empty path", () => {
    expect(pathSet({ a: 1 }, [], { b: 2 })).toEqual({ b: 2 });
  });
});

describe("pathRemove", () => {
  it("removes an object key immutably", () => {
    const next = pathRemove({ a: 1, b: 2 }, ["a"]);
    expect(next).toEqual({ b: 2 });
  });

  it("removes an array element and preserves order", () => {
    const next = pathRemove({ xs: [10, 20, 30] }, ["xs", 1]);
    expect(next).toEqual({ xs: [10, 30] });
  });

  it("is a no-op for missing paths", () => {
    const o = { a: 1 };
    expect(pathRemove(o, ["z"])).toEqual({ a: 1 });
  });
});

describe("prune", () => {
  it("drops empty strings, null, empty arrays and empty objects", () => {
    expect(prune({ a: "", b: null, c: [], d: {}, e: 0, f: false, g: "x" })).toEqual({
      e: 0,
      f: false,
      g: "x",
    });
  });

  it("recursively prunes nested structures", () => {
    expect(
      prune({
        resourceType: "Patient",
        name: [{ given: [""], family: "Smith" }, { given: [] }],
        telecom: [{ value: "" }],
      }),
    ).toEqual({
      resourceType: "Patient",
      name: [{ family: "Smith" }],
    });
  });
});
