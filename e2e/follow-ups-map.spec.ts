import { expect, test, type Page } from "@playwright/test";

const cities = [
  { name: "Nantes", code: "44109", departmentCode: "44", postalCodes: ["44000"], latitude: 47.2382, longitude: -1.5603 },
  { name: "Paris", code: "75056", departmentCode: "75", postalCodes: ["75001"], latitude: 48.8566, longitude: 2.3522 },
];

async function createApplication(page: Page, company: string, title: string, city = "Nantes") {
  await page.goto("/candidatures/nouvelle");
  await page.getByRole("textbox", { name: "Entreprise *", exact: true }).fill(company);
  await page.getByRole("textbox", { name: "Intitulé du poste *", exact: true }).fill(title);
  await page.getByLabel("Date de candidature").fill("2026-01-02");
  await page.getByLabel("Ville", { exact: true }).fill(city);
  await page.getByRole("option", { name: new RegExp(city) }).click();
  for (const name of ["DevOps", "IA"]) { await page.getByLabel("Tags *").fill(name); await page.getByLabel("Tags *").press("Enter"); }
  await page.getByRole("button", { name: "Ajouter la candidature" }).click();
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  return page.url().split("/").pop()!;
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/communes?*", route => route.fulfill({ contentType: "application/json", body: JSON.stringify(cities) }));
  await page.route("https://tile.openstreetmap.org/**", route => route.abort());
  page.on("dialog", dialog => dialog.accept());
});

test("enregistrer, modifier et supprimer les relances et filtrer leurs événements", async ({ page }) => {
  const company = `Relance E2E ${Date.now()}`;
  await createApplication(page, company, "Développeur de démonstration");
  const followUps = page.getByRole("region", { name: "Relances de candidature" });
  const tagColors = await page.locator(".detail-tags .tag-badge").evaluateAll(tags => tags.map(tag => getComputedStyle(tag).backgroundColor));
  expect(new Set(tagColors).size).toBe(2);
  for (const [date, note] of [["2026-01-03", "Mail envoyé"], ["2026-01-04", "Appel recruteur"]]) {
    await followUps.getByRole("button", { name: "Enregistrer une relance", exact: true }).click();
    await followUps.getByLabel("Date de relance *").fill(date);
    await followUps.getByLabel("Note (facultative)").fill(note);
    await followUps.getByRole("button", { name: "Enregistrer la relance", exact: true }).click();
    await expect(followUps.getByText(note, { exact: true })).toBeVisible();
  }
  await expect(followUps).toContainText("2 relances");
  await expect(page.locator(".detail-card-heading")).toContainText("Postulée");
  await followUps.getByRole("button", { name: /Modifier la relance du 04/ }).click();
  await followUps.getByLabel("Date de relance *").fill("2026-01-05");
  await followUps.getByLabel("Note (facultative)").fill("Note corrigée");
  await followUps.getByRole("button", { name: "Enregistrer la relance", exact: true }).click();
  await expect(followUps.getByText("Note corrigée", { exact: true })).toBeVisible();
  await followUps.getByRole("button", { name: /Supprimer la relance du 05/ }).click();
  await expect(followUps.getByText("Note corrigée", { exact: true })).toHaveCount(0);
  await expect(followUps).toContainText("1 relance");
  await expect(page.locator(".timeline .follow-up-label")).toHaveCount(1);
  await page.getByRole("link", { name: "Retour au tableau" }).click();
  await page.getByRole("searchbox", { name: "Rechercher" }).fill(company);
  await page.getByRole("button", { name: "Historique", exact: true }).click();
  await expect(page.locator(".panel-heading")).toContainText("1 candidature · 2 événements");
  await page.getByLabel("Période", { exact: true }).selectOption("custom");
  await page.getByLabel("Date de début", { exact: true }).fill("2026-01-03");
  await page.getByLabel("Date de fin", { exact: true }).fill("2026-01-03");
  await page.getByRole("button", { name: "Appliquer", exact: true }).click();
  await expect(page.locator(".panel-heading")).toContainText("1 candidature · 1 événement");
  await expect(page.locator(".history-entry-follow-up")).toContainText("Mail envoyé");
  expect(await page.locator(".history-entry .tag-badge").evaluateAll(tags => tags.map(tag => getComputedStyle(tag).backgroundColor))).toEqual(tagColors);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.locator(".history-job").click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Supprimer", exact: true }).click();
  await expect(page).toHaveURL("/");
});

test("aperçu au survol et au clavier, sélection des groupes et navigation directe", async ({ page, browser }) => {
  test.setTimeout(60_000);
  const prefix = `Carte E2E ${Date.now()}`;
  const ids: string[] = [];
  for (let index = 0; index < 4; index++) ids.push(await createApplication(page, `${prefix} ${index}`, `Poste Nantes ${index}`));
  const singleId = await createApplication(page, `${prefix} Paris`, "Poste Paris", "Paris");
  ids.push(singleId);
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Rechercher" }).fill(prefix);
  await page.getByRole("button", { name: "Carte", exact: true }).click();
  const group = page.getByRole("button", { name: /Nantes — 4 candidatures/ });
  await group.hover();
  const preview = page.getByRole("region", { name: "Candidatures à Nantes" });
  await expect(preview).toBeVisible();
  await expect(preview.getByRole("link")).toHaveCount(3);
  await group.click();
  await expect(preview.getByRole("link")).toHaveCount(4);
  await preview.getByRole("link").first().click();
  await expect(page).toHaveURL(/\/candidatures\/\d+$/);
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Rechercher" }).fill(prefix);
  await page.getByRole("button", { name: "Carte", exact: true }).click();
  const single = page.getByRole("button", { name: "Poste Paris — Paris. Ouvrir la fiche" });
  await single.focus();
  await expect(page.getByRole("region", { name: "Candidatures à Paris" })).toContainText("DevOps");
  await single.press("Enter");
  await expect(page).toHaveURL(`/candidatures/${singleId}`);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Rechercher" }).fill(prefix);
  await page.getByRole("button", { name: "Carte", exact: true }).click();
  await group.click();
  await expect(preview.getByRole("link")).toHaveCount(4);
  const cardBox = await page.locator(".map-preview").boundingBox();
  const mapBox = await page.locator(".application-map").boundingBox();
  expect(cardBox!.x).toBeGreaterThanOrEqual(mapBox!.x);
  expect(cardBox!.x + cardBox!.width).toBeLessThanOrEqual(mapBox!.x + mapBox!.width);
  expect(cardBox!.y + cardBox!.height).toBeLessThanOrEqual(mapBox!.y + mapBox!.height);
  const touchContext = await browser.newContext({ viewport: { width: 390, height: 900 }, hasTouch: true, isMobile: true });
  try {
    const touch = await touchContext.newPage();
    await touch.route("https://tile.openstreetmap.org/**", route => route.abort());
    await touch.goto(new URL("/", page.url()).toString());
    await touch.getByRole("searchbox", { name: "Rechercher" }).fill(prefix);
    await touch.getByRole("button", { name: "Carte", exact: true }).tap();
    await touch.getByRole("button", { name: /Nantes — 4 candidatures/ }).tap();
    await expect(touch.getByRole("region", { name: "Candidatures à Nantes" }).getByRole("link")).toHaveCount(4);
    await touch.getByRole("button", { name: "Fermer l’aperçu" }).tap();
    await touch.getByRole("button", { name: "Poste Paris — Paris. Ouvrir la fiche" }).tap();
    await expect(touch).toHaveURL(new URL(`/candidatures/${singleId}`, page.url()).toString());
  } finally { await touchContext.close(); }
  for (const id of ids) { await page.goto(`/candidatures/${id}`); await page.getByRole("button", { name: "Supprimer", exact: true }).click(); await expect(page).toHaveURL("/"); }
});
