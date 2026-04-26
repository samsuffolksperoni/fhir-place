import { expect, test } from "@playwright/test";

test.describe("Patient search URL sync", () => {
  test("submitting a search updates the URL with the active filters", async ({
    page,
  }) => {
    await page.goto("/Patient");
    const search = page.getByTestId("resource-search");
    await search.getByRole("textbox", { name: "given" }).fill("Alan");
    await search.getByRole("button", { name: "Search" }).click();

    await expect(page.getByTestId("patient-row")).toHaveCount(1);
    await expect(page).toHaveURL(/\/Patient\?.*given=Alan/);
  });

  test("loading a URL with a filter pre-fills the form and applies it", async ({
    page,
  }) => {
    await page.goto("/Patient?given=Alan");

    const search = page.getByTestId("resource-search");
    await expect(search).toBeVisible();
    await expect(search.getByRole("textbox", { name: "given" })).toHaveValue(
      "Alan",
    );
    await expect(page.getByTestId("patient-row")).toHaveCount(1);
    await expect(page.getByTestId("patient-row")).toContainText(
      "Alan Mathison Turing",
    );
  });
});
