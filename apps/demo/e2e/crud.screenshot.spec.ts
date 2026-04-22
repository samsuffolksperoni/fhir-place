import { expect, test } from "@playwright/test";

test.describe("CRUD flows", () => {
  test("search form driven by CapabilityStatement filters the list", async ({
    page,
  }) => {
    await page.goto("/Patient");
    const search = page.getByTestId("resource-search");
    await expect(search).toBeVisible();

    // Use the "gender" search param (token type, advertised by the mock server).
    await search.getByRole("textbox", { name: "gender" }).fill("male");
    await search.getByRole("button", { name: "Search" }).click();

    await expect(page.getByTestId("patient-row")).toHaveCount(1);
    await expect(page.getByTestId("patient-row")).toContainText("Alan Mathison Turing");

    await page.screenshot({
      path: "../../screenshots/05-search-by-gender.png",
      fullPage: true,
    });

    // Clear and verify results expand back.
    await search.getByRole("button", { name: "Clear" }).click();
    await search.getByRole("button", { name: "Search" }).click();
    await expect(page.getByTestId("patient-row")).toHaveCount(4);
  });

  test("create → edit → delete a patient end-to-end", async ({ page }) => {
    await page.goto("/Patient");
    await page.getByTestId("create-patient").click();
    await expect(page).toHaveURL(/\/Patient\/new/);

    await page.screenshot({
      path: "../../screenshots/06-create-form.png",
      fullPage: true,
    });

    // Populate minimum fields
    await page.getByRole("button", { name: "+ Add name" }).click();
    const textboxes = page.getByRole("textbox");
    await textboxes.nth(0).fill("Margaret");          // given
    await textboxes.nth(1).fill("Hamilton");           // family
    await page.locator('input[type="date"]').fill("1936-08-17");
    // gender select — there are multiple selects; pick the one with female option
    const genderSelect = page.getByRole("combobox", { name: /gender/i }).first();
    await genderSelect.selectOption("female");
    await page.getByRole("button", { name: /create patient/i }).click();

    // Navigated to the detail view of the newly created patient
    await expect(page.getByTestId("resource-view")).toBeVisible();
    await expect(page.getByText("Margaret Hamilton")).toBeVisible();
    await expect(page.getByText("1936-08-17")).toBeVisible();

    await page.screenshot({
      path: "../../screenshots/07-created-patient.png",
      fullPage: true,
    });

    // Edit flow — bump the family name
    await page.getByTestId("edit-resource").click();
    await expect(page).toHaveURL(/\/edit$/);
    const familyInput = page.getByRole("textbox", { name: "Family" });
    await familyInput.fill("Hamilton-Apollo");
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByText("Margaret Hamilton-Apollo")).toBeVisible();

    await page.screenshot({
      path: "../../screenshots/08-edited-patient.png",
      fullPage: true,
    });

    // Delete flow
    await page.getByTestId("delete-resource").click();
    await expect(page.getByTestId("delete-confirm")).toBeVisible();

    await page.screenshot({
      path: "../../screenshots/09-delete-confirm.png",
      fullPage: true,
    });

    await page.getByTestId("delete-confirm-button").click();
    await expect(page).toHaveURL(/\/Patient$/);
    await expect(page.getByText("Margaret Hamilton-Apollo")).toHaveCount(0);
  });
});
