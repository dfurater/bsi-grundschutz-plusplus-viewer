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

test.describe("Kernflows", () => {
  test("Sort-Dropdown sitzt im Filterpanel und wirkt auf Reihenfolge", async ({ page }) => {
    /* REQ: User Request Sort-Umzug Sidebar */
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/#/search?q=KONF");

    await expect(page.locator(".app-header-shell .search-row")).toHaveCount(0);

    const sidebarSort = page.locator(".facet-panel .facet-sort-block select");
    await expect(sidebarSort).toBeVisible();
    await expect(page.locator(".facet-panel .facet-sort-label")).toHaveText("Relevanz");

    await sidebarSort.selectOption("id");
    await expect(page).toHaveURL(/sort=id-asc/);

    const resultIdLocator = page.locator(".result-card .result-topline strong");
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
    /* REQ: DoD-05, PD-06, RESP-01 */
    const cases = [
      { width: 375, expectWide: false, expectFilterButton: true, expectDatasetInline: false },
      { width: 768, expectWide: false, expectFilterButton: true, expectDatasetInline: false },
      { width: 1024, expectWide: false, expectFilterButton: true, expectDatasetInline: false },
      { width: 1280, expectWide: true, expectFilterButton: false, expectDatasetInline: false }
    ] as const;

    for (const entry of cases) {
      await page.setViewportSize({ width: entry.width, height: 900 });
      await page.goto("/#/search?q=KONF");

      await expect(page.locator(".search-row")).toHaveCount(0);
      await expect(page.locator(".search-layout.wide")).toHaveCount(entry.expectWide ? 1 : 0);
      await expect(page.getByRole("button", { name: "Filter" })).toHaveCount(entry.expectFilterButton ? 1 : 0);
      await expect(page.getByLabel("Datensatz auswählen")).toHaveCount(entry.expectDatasetInline ? 1 : 0);
    }
  });

  test("Suche per Overlay Enter und Clear", async ({ page }) => {
    await page.goto("/#/search");
    await page.getByRole("button", { name: "Suche öffnen" }).click();

    const overlayDialog = page.getByRole("dialog", { name: "Suche" });
    const searchInput = overlayDialog.getByRole("searchbox", { name: "Suche" });
    await searchInput.click();
    await searchInput.type("a");
    await expect(searchInput).toBeFocused();
    await searchInput.fill("KONF.12.4");
    await searchInput.press("Enter");

    await expect(page).toHaveURL(/q=KONF\.12\.4/);

    await page.getByRole("button", { name: "Suche öffnen" }).click();
    await overlayDialog.getByRole("button", { name: "Suche leeren" }).click();
    await expect(page).not.toHaveURL(/q=KONF\.12\.4/);
    await expect(overlayDialog).toBeHidden();

    await page.getByRole("button", { name: "Suche öffnen" }).click();
    await expect(page.getByRole("dialog", { name: "Suche" }).getByRole("searchbox", { name: "Suche" })).toHaveValue("");
  });

  test("Theme-Toggle liegt im Header rechts und wechselt Theme", async ({ page }) => {
    await page.goto("/#/search?q=KONF");

    const themeRoot = page.locator("html");
    const initialTheme = (await themeRoot.getAttribute("data-theme")) ?? "light";
    const nextTheme = initialTheme === "dark" ? "light" : "dark";
    const toggleLabel = initialTheme === "dark" ? "Hellmodus" : "Dunkelmodus";
    const nextToggleLabel = nextTheme === "dark" ? "Hellmodus" : "Dunkelmodus";
    const themeToggle = page.locator(".app-bar-end .theme-toggle-button");

    await expect(themeToggle).toHaveCount(1);
    await expect(themeToggle).toHaveAttribute("aria-label", toggleLabel);
    await themeToggle.click();

    await expect(themeRoot).toHaveAttribute("data-theme", nextTheme);
    await expect(themeToggle).toHaveAttribute("aria-label", nextToggleLabel);
  });

  test("Debounce aktualisiert Suchzustand", async ({ page }) => {
    await page.goto("/#/search");
    await page.getByRole("button", { name: "Suche öffnen" }).click();
    const searchInput = page.getByRole("searchbox", { name: "Suche" }).first();
    await searchInput.fill("abc");
    await page.waitForTimeout(360);
    await expect(page).toHaveURL(/q=abc/);
  });

  test("Search Overlay schliesst per ESC und gibt Fokus zurueck", async ({ page }) => {
    await page.goto("/#/search");
    const trigger = page.getByRole("button", { name: "Suche öffnen" });
    await trigger.click();
    await expect(page.getByRole("dialog", { name: "Suche" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Suche" })).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("Filter als Sheet unter 1024", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto("/#/search?q=KONF");

    await page.getByRole("button", { name: "Filter" }).click();
    await expect(page.getByRole("dialog", { name: "Filter" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Filter" })).toBeHidden();
  });

  test("Back-to-results setzt control Kontext zurück", async ({ page }) => {
    await page.goto("/#/search?q=KONF");
    await page.locator(".result-card").first().click();

    await expect(page).toHaveURL(/control=/);
    await expect(page.getByRole("button", { name: "Zur Ergebnisliste" })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "Zur Ergebnisliste" }).click();
    await expect(page).not.toHaveURL(/control=/);
  });

  test("CSV Export ist im Header konditional sichtbar", async ({ page }) => {
    await page.goto("/#/search?q=KONF");

    await expect(page.getByRole("button", { name: /Export CSV/ })).toHaveCount(0);

    await page.getByRole("checkbox", { name: "Für CSV auswählen" }).first().check();
    await expect(page.getByRole("button", { name: "Export CSV (1)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Export CSV (1)" })).toBeEnabled();
  });

  test("Mobile: kein Overflow-Trigger, CSV-Export bleibt über Header erreichbar", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto("/#/search?q=KONF");

    await expect(page.getByLabel("Datensatz auswählen")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Weitere Aktionen" })).toHaveCount(0);
    await page.getByRole("checkbox", { name: "Für CSV auswählen" }).first().check();
    await expect(page.getByRole("button", { name: "Export CSV (1)" })).toBeVisible();
  });
});
