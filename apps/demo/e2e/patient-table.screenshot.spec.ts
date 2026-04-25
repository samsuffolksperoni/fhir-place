import { expect, test } from "@playwright/test";

test.describe("patient list — table view + column picker", () => {
  test.beforeEach(async ({ page }) => {
    // Reset persisted layout / column choices before each test so the
    // demo always starts in list view.
    await page.addInitScript(() => {
      window.localStorage.removeItem("fhir-place-demo-patient-layout");
      window.localStorage.removeItem("fhir-place-demo-patient-columns");
    });
  });

  test("toggling to table view renders ResourceTable and ColumnPicker hides a column", async ({
    page,
  }) => {
    await page.goto("/Patient");
    await page.getByTestId("layout-table").click();

    const table = page.getByTestId("resource-table");
    await expect(table).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /^name$/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /gender/i })).toBeVisible();

    await page.screenshot({
      path: "../../screenshots/12-patient-table.png",
      fullPage: true,
    });

    await page.getByRole("button", { name: /columns/i }).click();
    await page.getByLabel("Gender").click();
    await expect(page.getByRole("columnheader", { name: /gender/i })).toHaveCount(0);

    await page.screenshot({
      path: "../../screenshots/13-patient-table-column-picker.png",
      fullPage: true,
    });
  });

  test("layout choice persists across reload via localStorage", async ({ page }) => {
    await page.goto("/Patient");
    await page.getByTestId("layout-table").click();
    await expect(page.getByTestId("resource-table")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("resource-table")).toBeVisible();
  });
});
