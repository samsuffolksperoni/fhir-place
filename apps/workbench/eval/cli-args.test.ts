import { describe, expect, it } from "vitest";
import { parseArgs } from "./cli-args.js";

describe("parseArgs", () => {
  it("returns ok with defaults for an empty argv", () => {
    const r = parseArgs([]);
    expect(r).toEqual({ kind: "ok", args: { live: false } });
  });

  it("strips a leading `--` separator (pnpm forwarding)", () => {
    expect(parseArgs(["--", "--live"])).toEqual({
      kind: "ok",
      args: { live: true },
    });
  });

  it("strips `--` anywhere in the argv list", () => {
    expect(parseArgs(["--live", "--", "--json", "out.json"])).toEqual({
      kind: "ok",
      args: { live: true, jsonPath: "out.json" },
    });
  });

  it("parses --live", () => {
    expect(parseArgs(["--live"])).toEqual({
      kind: "ok",
      args: { live: true },
    });
  });

  it("parses --json with a separate value", () => {
    expect(parseArgs(["--json", "out.json"])).toEqual({
      kind: "ok",
      args: { live: false, jsonPath: "out.json" },
    });
  });

  it("parses --json=value", () => {
    expect(parseArgs(["--json=foo.json"])).toEqual({
      kind: "ok",
      args: { live: false, jsonPath: "foo.json" },
    });
  });

  it("errors when --json has no value", () => {
    const r = parseArgs(["--json"]);
    expect(r.kind).toBe("error");
    if (r.kind === "error") expect(r.message).toMatch(/--json requires a path/);
  });

  it("errors when --json is followed by another flag", () => {
    const r = parseArgs(["--json", "--live"]);
    expect(r.kind).toBe("error");
    if (r.kind === "error") expect(r.message).toMatch(/--json requires a path/);
  });

  it("errors when --json= is empty", () => {
    const r = parseArgs(["--json="]);
    expect(r.kind).toBe("error");
    if (r.kind === "error") expect(r.message).toMatch(/--json= requires a path/);
  });

  it("returns help for -h / --help", () => {
    expect(parseArgs(["-h"])).toEqual({ kind: "help" });
    expect(parseArgs(["--help"])).toEqual({ kind: "help" });
  });

  it("errors on unknown args", () => {
    const r = parseArgs(["--bogus"]);
    expect(r.kind).toBe("error");
    if (r.kind === "error") expect(r.message).toMatch(/unknown argument/);
  });

  it("supports the documented pnpm form `pnpm eval -- --live --json out.json`", () => {
    expect(parseArgs(["--", "--live", "--json", "out.json"])).toEqual({
      kind: "ok",
      args: { live: true, jsonPath: "out.json" },
    });
  });
});
