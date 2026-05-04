import { expect, test } from "@playwright/test";

/**
 * Verifies that write buttons (+ New, Edit, Delete) are hidden when the mock
 * CapabilityStatement does not advertise the corresponding interaction for a
 * resource type, and remain visible for resource types that do advertise them.
 *
 * The mock server (handlers.ts) gives Patient full CRUD and Observation only
 * read + search-type, so Observation is the read-only canary.
 */

test.describe("capability-gated write buttons", () => {
  test("Patient list shows + New button (create advertised)", async ({ page }) => {
    await page.goto("/Patient");
    await expect(page.getByTestId("create-patient")).toBeVisible();
  });

  test("Observation list hides + New button (create NOT advertised)", async ({ page }) => {
    await page.goto("/Observation");
    // The button must not be in the DOM at all — not just hidden.
    await expect(page.getByTestId("create-observation")).toHaveCount(0);
  });

  test("Patient detail shows Edit and Delete buttons", async ({ page }) => {
    await page.goto("/Patient");
    // Navigate into the first patient row
    await page.getByTestId("patient-row").first().click();
    await expect(page.getByTestId("edit-resource")).toBeVisible();
    await expect(page.getByTestId("delete-resource")).toBeVisible();
  });

  test("Observation detail hides Edit and Delete buttons (update/delete NOT advertised)", async ({
    page,
  }) => {
    // Navigate directly to a known Observation fixture to avoid depending on
    // the list page loading rows (Observation uses list layout via formatPrimary,
    // so the row testid would be "observation-row" not "resource-row").
    await page.goto("/Observation/obs-hr-ada");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("edit-resource")).toHaveCount(0);
    await expect(page.getByTestId("delete-resource")).toHaveCount(0);
  });
});
