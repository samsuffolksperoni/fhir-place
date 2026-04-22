import { expect, test } from "@playwright/test";

test.describe("fhir-place demo", () => {
  test("patient list renders and filters by name", async ({ page }) => {
    await page.goto("/Patient");
    await expect(page.getByRole("heading", { name: /patients/i })).toBeVisible();
    const rows = page.getByTestId("patient-row");
    await expect(rows).toHaveCount(4);
    await expect(rows).toContainText(["Ada Lovelace", "Alan Mathison Turing"]);

    await page.screenshot({
      path: "../../screenshots/01-patient-list.png",
      fullPage: true,
    });

    await page.getByTestId("patient-search").fill("hop");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Grace Hopper");

    await page.screenshot({
      path: "../../screenshots/02-patient-list-filtered.png",
      fullPage: true,
    });
  });

  test("clicking a patient navigates to the spec-driven detail view", async ({
    page,
  }) => {
    await page.goto("/Patient");
    await page.getByRole("link", { name: /ada lovelace/i }).click();

    await expect(page).toHaveURL(/\/Patient\/ada/);
    const view = page.getByTestId("resource-view");
    await expect(view).toBeVisible();

    // Spec-driven rendering: labels come from the StructureDefinition short text.
    await expect(view).toContainText("Ada Lovelace");
    await expect(view).toContainText("1815-12-10");
    await expect(view).toContainText("ada@example.com");
    await expect(view).toContainText("1 Workhouse Lane");
    // Narrative (sanitised via DOMPurify) is shown.
    await expect(view).toContainText(/Synthetic test patient ada/);

    await page.screenshot({
      path: "../../screenshots/03-patient-detail.png",
      fullPage: true,
    });
  });
});
