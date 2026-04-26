import { expect, test } from "@playwright/test";

test.describe("Delete failure handling", () => {
  test("server-side delete failure surfaces inline in the confirm panel", async ({
    page,
  }) => {
    // Intercept any DELETE on /Patient/<id> and respond 409 with an
    // OperationOutcome — mirrors what HAPI returns when a resource has
    // referencing children that block deletion.
    await page.route(/\/Patient\/[^?]+$/, async (route) => {
      if (route.request().method() !== "DELETE") return route.continue();
      await route.fulfill({
        status: 409,
        contentType: "application/fhir+json",
        body: JSON.stringify({
          resourceType: "OperationOutcome",
          issue: [
            {
              severity: "error",
              code: "conflict",
              diagnostics: "Patient is referenced by other resources",
            },
          ],
        }),
      });
    });

    await page.goto("/Patient");
    await page.getByTestId("patient-row").first().click();
    await page.getByTestId("delete-resource").click();
    await expect(page.getByTestId("delete-confirm")).toBeVisible();
    await page.getByTestId("delete-confirm-button").click();

    // Inline error appears, the confirm panel stays open, and the user is
    // not navigated away.
    await expect(page.getByTestId("delete-error")).toBeVisible();
    await expect(page.getByTestId("delete-confirm")).toBeVisible();
    await expect(page).toHaveURL(/\/Patient\/[^/]+$/);
  });
});
