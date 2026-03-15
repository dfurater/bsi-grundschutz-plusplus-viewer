import { expect, test } from "@playwright/test";

function normalizeIds(ids: string[]) {
  return ids.map((value) => value.trim()).filter(Boolean);
}

function isLexicographicallySorted(ids: string[], direction: "asc" | "desc") {
  for (let index = 1; index < ids.length; index += 1) {
    const prev = ids[index - 1];
    const current = ids[index];
    const compare = prev.localeCompare(current, "de");
    if (direction === "asc" && compare > 0) {
      return false;
    }
    if (direction === "desc" && compare < 0) {
      return false;
    }
  }
  return true;
}

function escapeForRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function gotoSearch(page: Parameters<typeof test>[0]["page"], query = "KONF") {
  await page.goto(`/#/search?q=${encodeURIComponent(query)}`);
  await expect(page.locator(".result-card").first()).toBeVisible({ timeout: 15000 });
}

test.describe("Kernflows", () => {
  test("Sort-Dropdown sitzt im Filterpanel und wirkt auf Reihenfolge", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoSearch(page);

    await expect(page.locator(".app-header-shell .c-search-input")).toHaveCount(0);

    const sidebarSort = page.locator(".facet-panel .facet-sort-controls select");
    await expect(sidebarSort).toBeVisible();
    await expect(page.locator(".facet-panel .facet-sort-summary")).toHaveText("Relevanz");

    await sidebarSort.selectOption("id");
    await expect(page).toHaveURL(/sort=id-asc/);

    const resultIdLocator = page.locator(".result-list-items .id-label");
    await expect.poll(async () => resultIdLocator.count()).toBeGreaterThan(1);
    await expect
      .poll(async () => {
        const ids = normalizeIds(await resultIdLocator.allInnerTexts()).slice(0, 12);
        return isLexicographicallySorted(ids, "asc");
      })
      .toBe(true);

    await page.getByRole("button", { name: "Sortierung absteigend" }).first().click();
    await expect(page).toHaveURL(/sort=id-desc/);
    await expect
      .poll(async () => {
        const ids = normalizeIds(await resultIdLocator.allInnerTexts()).slice(0, 12);
        return isLexicographicallySorted(ids, "desc");
      })
      .toBe(true);
  });

  test("Responsive Breakpoints 375/768/1024/1280", async ({ page }) => {
    const cases = [
      { width: 375, expectWide: false, expectFilterButton: true, expectSummaryTrigger: true },
      { width: 768, expectWide: false, expectFilterButton: true, expectSummaryTrigger: true },
      { width: 1024, expectWide: false, expectFilterButton: true, expectSummaryTrigger: true },
      { width: 1280, expectWide: true, expectFilterButton: false, expectSummaryTrigger: false }
    ] as const;

    for (const entry of cases) {
      await page.setViewportSize({ width: entry.width, height: 900 });
      await gotoSearch(page);

      await expect(page.locator(".search-layout.wide")).toHaveCount(entry.expectWide ? 1 : 0);
      await expect(page.getByRole("button", { name: "Filter" })).toHaveCount(entry.expectFilterButton ? 1 : 0);
      await expect(page.locator(".search-summary-trigger")).toHaveCount(entry.expectSummaryTrigger ? 1 : 0);
      await expect(page.locator(".app-header-shell").getByRole("button", { name: "Suche öffnen" })).toHaveCount(0);
      await expect(page.getByLabel("Datensatz auswählen")).toHaveCount(0);
    }
  });

  test("Skip-Link springt direkt in den Sucharbeitsbereich", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoSearch(page);

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Zum Inhalt springen" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Zum Sucharbeitsbereich springen" })).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page.locator("#search-workspace")).toBeFocused();
    await expect(page).toHaveURL(/#\/search/);
  });

  test("Suche per Overlay Enter und Clear", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto("/#/about");

    const headerSearchTrigger = page.locator(".app-header-shell").getByRole("button", { name: "Suche öffnen" });
    await headerSearchTrigger.click();

    const overlayDialog = page.getByRole("dialog", { name: "Katalog durchsuchen" });
    const searchInput = overlayDialog.getByRole("searchbox", { name: "Suche" });
    await searchInput.fill("KONF.12.4");
    await searchInput.press("Enter");

    await expect(page).toHaveURL(/q=KONF\.12\.4/);
    await expect(overlayDialog).toBeHidden();
    await expect(page.locator('[data-search-results-focus="results"], [data-search-results-focus="status"]')).toBeFocused();

    await page.locator(".search-summary-trigger").click();
    const reopenedSearchInput = overlayDialog.getByRole("searchbox", { name: "Suche" });
    await expect(reopenedSearchInput).toHaveValue("KONF.12.4");
    await overlayDialog.getByRole("button", { name: "Suchtext leeren" }).click();
    await expect(page).not.toHaveURL(/q=/);
    await expect(overlayDialog).toBeVisible();
    await expect(reopenedSearchInput).toHaveValue("");
    await expect(overlayDialog.getByRole("button", { name: "Suchtext leeren" })).toHaveCount(0);
  });

  test("Header bleibt dark-only und ohne Theme-Toggle", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoSearch(page);

    await expect(page.locator(".theme-toggle-button")).toHaveCount(0);
    await expect(page.locator(".app-header-shell")).toContainText("Suche");
    await expect(page.locator(".app-header-shell")).toContainText("Static Viewer - BSI Grundschutz++");
  });

  test("Debounce aktualisiert Suchzustand", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/#/search");
    const searchInput = page.locator(".search-console-shell .c-search-input");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("abc");
    await page.waitForTimeout(360);
    await expect(page).toHaveURL(/q=abc/);
  });

  test("Search Overlay schließt per ESC und gibt Fokus zurück", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto("/#/about");
    const trigger = page.locator(".app-header-shell").getByRole("button", { name: "Suche öffnen" });
    await trigger.click();
    await expect(page.getByRole("dialog", { name: "Katalog durchsuchen" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Katalog durchsuchen" })).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("Filter als Sheet unter 1280", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await gotoSearch(page);

    await page.getByRole("button", { name: "Filter" }).click();
    await expect(page.getByRole("dialog", { name: "Filter" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Filter" })).toBeHidden();
  });

  test("Back-to-results setzt control Kontext zurück", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoSearch(page);
    await page.locator(".result-card-button").first().click();

    await expect(page).toHaveURL(/control=/);
    await expect(page.getByRole("button", { name: "Zur Ergebnisliste" })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "Zur Ergebnisliste" }).click();
    await expect(page).not.toHaveURL(/control=/);
  });

  test("Pagination bleibt über Deep-Link und Back-to-results stabil, inklusive Tastaturbedienung", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/#/search?q=KONF&page=2&pageSize=25");

    await expect(page.getByText(/^Seite 2 von \d+/)).toBeVisible({ timeout: 15000 });

    const nextPageButton = page.getByRole("button", { name: "Nächste Seite" });
    await nextPageButton.focus();
    await expect(nextPageButton).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/page=3/);
    await expect(page.getByText(/^Seite 3 von \d+/)).toBeVisible({ timeout: 15000 });

    await page.locator(".result-card-button").first().click();
    await expect(page).toHaveURL(/control=/);

    await page.getByRole("button", { name: "Zur Ergebnisliste" }).click();
    await expect(page).toHaveURL(/page=3/);
    await expect(page).toHaveURL(/pageSize=25/);
    await expect(page).not.toHaveURL(/control=/);
    await expect(page.getByText(/^Seite 3 von \d+/)).toBeVisible({ timeout: 15000 });
  });

  test("Direkter Control-Deep-Link öffnet die Detailansicht stabil", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoSearch(page);
    await page.locator(".result-card-button").first().click();
    await expect(page).toHaveURL(/control=/);

    const currentUrl = new URL(page.url());
    const hashQuery = currentUrl.hash.split("?")[1] ?? "";
    const params = new URLSearchParams(hashQuery);
    const controlId = params.get("control");
    const topGroupId = params.get("top");

    expect(controlId).toBeTruthy();
    expect(topGroupId).toBeTruthy();
    if (!controlId || !topGroupId) {
      throw new Error("Control-Deep-Link konnte nicht aus der URL gelesen werden.");
    }

    await page.goto(`/#/control/${encodeURIComponent(controlId)}?top=${encodeURIComponent(topGroupId)}`);
    await expect(page.locator(".c-detail-identity .id-label").first()).toHaveText(controlId, { timeout: 15000 });
  });

  test("Ungültige Control-Route fällt robust auf die Startansicht zurück", async ({ page }) => {
    await page.goto("/#/control/%E0%A4%A?top=GC");
    await expect(page.getByRole("heading", { name: "Katalogbereiche" })).toBeVisible({ timeout: 15000 });
  });

  test("Graph-Knoten-Klick wechselt in den geklickten Control-Kontext", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoSearch(page, "GC.2.1");

    await page.locator(".result-card-button").first().click();
    await expect(page).toHaveURL(/control=/);
    const selectedControlBefore = (await page.locator(".c-detail-identity .id-label").first().innerText()).trim();

    const graphNode = page.locator(".relation-graph .graph-node").first();
    await expect(graphNode).toBeVisible({ timeout: 15000 });
    const targetControlId = String(await graphNode.locator("text").first().textContent()).trim();

    expect(targetControlId).not.toBe("");
    expect(targetControlId).not.toBe(selectedControlBefore);

    await graphNode.dispatchEvent("click");

    await expect(page.locator(".c-detail-identity .id-label").first()).toHaveText(targetControlId, { timeout: 15000 });
    await expect(page).toHaveURL(new RegExp(`control=${escapeForRegex(encodeURIComponent(targetControlId))}`));
  });

  test("CSV Export ist im Header konditional sichtbar", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoSearch(page);

    await expect(page.getByRole("button", { name: /CSV Export/ })).toHaveCount(0);

    await page.locator(".card-export-toggle").first().click();
    await expect(page.getByRole("button", { name: "CSV Export (1)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "CSV Export (1)" })).toBeEnabled();
  });

  test("CSV Export läuft aus dem Suchkontext erfolgreich durch", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoSearch(page);
    await page.locator(".card-export-toggle").first().click();

    const exportButton = page.getByRole("button", { name: "CSV Export (1)" });
    await expect(exportButton).toBeVisible();
    await exportButton.click();

    await expect(page.getByText(/CSV erfolgreich exportiert/)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /CSV Export/ })).toHaveCount(0);
  });

  test("Mobile: kein Overflow-Trigger, CSV-Export bleibt über Header erreichbar", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await gotoSearch(page);

    await expect(page.getByLabel("Datensatz auswählen")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Weitere Aktionen" })).toHaveCount(0);
    await page.locator(".card-export-toggle").first().click();
    await expect(page.getByRole("button", { name: "CSV Export (1)" })).toBeVisible();
  });
});
