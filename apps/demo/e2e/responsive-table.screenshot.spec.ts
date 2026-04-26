import { devices, expect, test } from "@playwright/test";

test.describe("ResourceTable — responsive layouts", () => {
  test.beforeEach(async ({ page }) => {
    // Force the table view so the responsive switch is exercised on the
    // Patient list (which is the easiest live-data surface for the test).
    await page.addInitScript(() => {
      window.localStorage.setItem("fhir-place-demo-patient-layout", "table");
    });
  });

  test("desktop viewport renders the <table> layout", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/Patient");
    await expect(page.getByTestId("resource-table-table")).toBeVisible();
    // Card layout is in the DOM but hidden by `sm:hidden` at this width.
    await expect(page.getByTestId("resource-table-cards")).toBeHidden();
  });

  test("phone viewport renders the card-stack layout instead of a clipped table", async ({
    browser,
  }) => {
    const context = await browser.newContext({ ...devices["iPhone 14"] });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.localStorage.setItem("fhir-place-demo-patient-layout", "table");
    });
    await page.goto("/Patient");

    // Card layout is the visible one on phone.
    const cards = page.getByTestId("resource-table-cards");
    await expect(cards).toBeVisible();
    await expect(page.getByTestId("resource-table-table")).toBeHidden();

    // At least one card with label/value pairs.
    const card = page.getByTestId("resource-row-card").first();
    await expect(card).toBeVisible();
    // Column header labels render as field labels in the card.
    await expect(card.getByText(/Name/)).toBeVisible();
    await expect(card.getByText(/Gender/)).toBeVisible();

    // No body horizontal scroll: scrollWidth should equal clientWidth (or be close).
    const overflow = await page.evaluate(() => {
      const el = document.documentElement;
      return el.scrollWidth - el.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(2);

    await page.screenshot({
      path: "../../screenshots/16-patient-table-mobile-cards.png",
      fullPage: true,
    });
    await context.close();
  });

  test("clicking a card navigates to the detail page (parity with table row click)", async ({
    browser,
  }) => {
    const context = await browser.newContext({ ...devices["iPhone 14"] });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.localStorage.setItem("fhir-place-demo-patient-layout", "table");
    });
    await page.goto("/Patient");
    await page.getByTestId("resource-row-card").first().click();
    await expect(page).toHaveURL(/\/Patient\/[^/]+$/);
    await expect(page.getByTestId("resource-view")).toBeVisible();
    await context.close();
  });
});
