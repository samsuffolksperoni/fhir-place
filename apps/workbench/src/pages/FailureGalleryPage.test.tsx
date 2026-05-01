import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { FailureGalleryPage } from "./FailureGalleryPage.js";

describe("FailureGalleryPage", () => {
  it("renders all required failure fixtures", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <FailureGalleryPage />
      </MemoryRouter>,
    );

    expect(html).toMatch(/no-allergy-data/);
    expect(html).toMatch(/missing-labs/);
    expect(html).toMatch(/prompt-injection/);
    expect(html).toMatch(/permission-violation/);
    expect(html).toMatch(/blocked, refused, and partial behavior/i);
  });
});
