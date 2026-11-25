import { expect, test } from "@playwright/test";

test("ajouter, filtrer, faire progresser puis supprimer une candidature", async ({ page }) => {
  const company = `Entreprise E2E ${Date.now()}`;
  await page.route("**/api/communes?*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([
        {
          name: "Nantes",
          code: "44109",
          departmentCode: "44",
          postalCodes: ["44000", "44100", "44200", "44300"],
          latitude: 47.2382,
          longitude: -1.5603,
        },
      ]),
    });
  });
  await page.goto("/");
  await page.getByRole("link", { name: "Ajouter", exact: true }).click();
  await expect(page).toHaveURL(/\/candidatures\/nouvelle$/);
  await page.getByRole("textbox", { name: "Entreprise *", exact: true }).fill(company);
  await page.getByRole("textbox", { name: "Intitulé du poste *", exact: true }).fill("Développeur TypeScript");
  await page.getByLabel("Date de candidature").fill("2026-01-02");
  await page.getByLabel("Ville").fill("Nantes");
  await page.getByRole("option", { name: /Nantes/ }).click();
  await page.getByLabel("Mode de travail").selectOption("hybrid");
  await page.getByLabel("Tags *").fill("IA");
  await page.getByLabel("Tags *").press("Enter");
  await page.getByRole("button", { name: "Ajouter la candidature" }).click();

  await expect(page.getByRole("heading", { name: "Développeur TypeScript" })).toBeVisible();
  await page.getByRole("link", { name: "Retour au tableau" }).click();
  await page.getByLabel("Filtrer par tag").selectOption("IA");
  await page.getByLabel("Filtrer par mode de travail").selectOption("hybrid");
  await page.getByRole("searchbox", { name: "Rechercher" }).fill(company);
  const row = page.getByRole("row").filter({ hasText: company });
  await expect(row).toBeVisible();
  await page.getByRole("button", { name: "Historique", exact: true }).click();
  const history = page.getByRole("region", { name: "Historique des candidatures envoyées" });
  await expect(history.getByRole("link", { name: /Développeur TypeScript/ })).toBeVisible();
  await expect(history.locator("time[datetime='2026-01-02']")).toBeVisible();
  await page.getByLabel("Période", { exact: true }).selectOption("custom");
  await page.getByRole("button", { name: "Appliquer", exact: true }).click();
  await expect(page.locator(".history-controls").getByRole("alert")).toContainText("Renseignez");
  await page.getByLabel("Date de début", { exact: true }).fill("2026-01-03");
  await page.getByLabel("Date de fin", { exact: true }).fill("2026-01-02");
  await page.getByRole("button", { name: "Appliquer", exact: true }).click();
  await expect(page.locator(".history-controls").getByRole("alert")).toContainText("précéder");
  await page.getByLabel("Date de début", { exact: true }).fill("2026-01-02");
  await page.getByRole("button", { name: "Appliquer", exact: true }).click();
  await expect(page.locator(".history-controls").getByRole("alert")).toHaveCount(0);
  await expect(history.getByText(company, { exact: true })).toBeVisible();
  await expect(page.locator(".panel-heading")).toContainText("1 candidature · 1 événement");
  await page.getByLabel("Date de fin", { exact: true }).fill("2026-01-04");
  await page.getByLabel("Date de début", { exact: true }).fill("2026-01-03");
  await page.getByRole("button", { name: "Appliquer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Aucun résultat" })).toBeVisible();
  await page.getByRole("button", { name: "Liste", exact: true }).click();
  await expect(row).toBeVisible();
  await page.getByRole("button", { name: "Historique", exact: true }).click();
  await expect(page.getByLabel("Date de début", { exact: true })).toHaveValue("2026-01-03");
  await expect(page.getByRole("heading", { name: "Aucun résultat" })).toBeVisible();
  await page.getByLabel("Période", { exact: true }).selectOption("all");
  await history.getByRole("link", { name: /Développeur TypeScript/ }).click();
  await expect(page.getByRole("heading", { name: "Développeur TypeScript" })).toBeVisible();
  await page.getByRole("link", { name: "Retour au tableau" }).click();
  await page.getByRole("searchbox", { name: "Rechercher" }).fill(company);
  await page.getByRole("button", { name: "Carte" }).click();
  await expect(page.getByLabel("Carte des candidatures")).toBeVisible();
  await page.getByRole("button", { name: "Liste" }).click();
  await row.getByLabel("Changer le statut").selectOption("interview");
  await expect(row.getByLabel("Changer le statut")).toHaveValue("interview");
  await row.getByRole("link", { name: "Détails" }).click();
  await expect(page.getByText("Depuis « Postulée »")).toBeVisible();

  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Supprimer" }).click();
  await expect(page).toHaveURL("/");
});
