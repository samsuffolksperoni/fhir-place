import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SyntheticOnlyBanner } from "./SyntheticOnlyBanner.js";

describe("SyntheticOnlyBanner", () => {
  it("renders the synthetic-only / not-for-clinical-use warning", () => {
    const html = renderToStaticMarkup(<SyntheticOnlyBanner />);
    expect(html).toMatch(/synthetic data only/i);
    expect(html).toMatch(/not for clinical use/i);
    expect(html).toMatch(/role="alert"/);
  });
});
