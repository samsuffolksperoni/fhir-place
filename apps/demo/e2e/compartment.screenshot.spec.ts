import { expect, test } from "@playwright/test";

test.describe("Patient compartment tables", () => {
  test("Patient detail shows separate tables per compartment resource type", async ({
    page,
  }) => {
    await page.goto("/Patient/ada");

    // Core detail view still renders.
    await expect(page.getByTestId("resource-view")).toBeVisible();
    await expect(page.getByText("Ada Lovelace")).toBeVisible();

    const compartment = page.getByTestId("patient-compartment");
    await expect(compartment).toBeVisible();

    // Populated types: Condition, MedicationRequest, AllergyIntolerance,
    // Observation, Procedure, Encounter, Immunization — all fixtured for Ada.
    for (const type of [
      "Condition",
      "MedicationRequest",
      "AllergyIntolerance",
      "Observation",
      "Procedure",
      "Encounter",
      "Immunization",
    ]) {
      await expect(
        page.getByTestId(`compartment-section-${type}`),
      ).toBeVisible();
    }

    // A specific known fixture appears under the right section.
    await expect(
      compartment.getByText("Essential hypertension"),
    ).toBeVisible();
    await expect(
      compartment.getByText("Lisinopril 20 mg oral tablet"),
    ).toBeVisible();
    await expect(compartment.getByText("Penicillin")).toBeVisible();

    await page.screenshot({
      path: "../../screenshots/12-patient-compartment.png",
      fullPage: true,
    });
  });

  test("empty compartment types are hidden (Patient with no clinical data)", async ({
    page,
  }) => {
    // turing has no fixture data beyond the Patient itself.
    await page.goto("/Patient/turing");
    await expect(page.getByTestId("resource-view")).toBeVisible();

    // The header still appears (because the component renders unconditionally
    // on Patient pages), but every section hides itself when its search
    // returns zero hits.
    await expect(
      page.getByTestId("compartment-section-Condition"),
    ).not.toBeVisible();
    await expect(
      page.getByTestId("compartment-section-MedicationRequest"),
    ).not.toBeVisible();
  });
});
