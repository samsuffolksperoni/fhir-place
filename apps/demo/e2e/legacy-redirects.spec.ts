import { expect, test } from "@playwright/test";

test.describe("Legacy route redirects", () => {
  test("legacy /settings redirects to /fhir-ui/settings and preserves query", async ({ page }) => {
    await page.goto("/settings?tab=servers");

    await expect(page).toHaveURL(/\/fhir-ui\/settings\?tab=servers$/);
    await expect(page.getByTestId("settings-page")).toBeVisible();
  });

  test("legacy resource detail route redirects to /fhir-ui and keeps hash", async ({ page }) => {
    await page.goto("/Patient/123#notes");

    await expect(page).toHaveURL(/\/fhir-ui\/Patient\/123#notes$/);
    await expect(page.getByTestId("resource-detail-page")).toBeVisible();
  });
});
