import { expect, test } from "@playwright/test";

test.describe("Kernflows", () => {
  test("Sort-Dropdown sitzt im Filterpanel und wirkt auf Reihenfolge", async ({ page }) => {
    /* REQ: User Request Sort-Umzug Sidebar */
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/#/search?q=KONF");

    await expect(page.locator(".app-header-shell .search-row select")).toHaveCount(0);

    const sidebarSort = page.locator(".facet-panel .facet-sort-block select");
    await expect(sidebarSort).toBeVisible();
    await expect(page.locator(".facet-panel .facet-sort-label")).toHaveText("Relevanz");

    await sidebarSort.selectOption("id");
    await expect(page).toHaveURL(/sort=id-asc/);

    const firstAsc = await page.locator(".result-card .result-topline strong").first().innerText();

    await page.getByRole("button", { name: "Sortierung absteigend" }).first().click();
    await expect(page).toHaveURL(/sort=id-desc/);

    const firstDesc = await page.locator(".result-card .result-topline strong").first().innerText();
    expect(firstAsc).not.toBe(firstDesc);
  });

  test("Responsive Breakpoints 375/768/1024/1280", async ({ page }) => {
    /* REQ: DoD-05, PD-06, RESP-01 */
    const cases = [
      { width: 375, expectSearchRow: false, expectWide: false, expectFilterButton: true },
      { width: 768, expectSearchRow: false, expectWide: false, expectFilterButton: true },
      { width: 1024, expectSearchRow: true, expectWide: false, expectFilterButton: true },
      { width: 1280, expectSearchRow: true, expectWide: true, expectFilterButton: false }
    ] as const;

    for (const entry of cases) {
      await page.setViewportSize({ width: entry.width, height: 900 });
      await page.goto("/#/search?q=KONF");

      await expect(page.locator(".search-row")).toHaveCount(entry.expectSearchRow ? 1 : 0);
      await expect(page.locator(".search-layout.wide")).toHaveCount(entry.expectWide ? 1 : 0);
      await expect(page.getByRole("button", { name: "Filter" })).toHaveCount(entry.expectFilterButton ? 1 : 0);
    }
  });

  test("Suche per Enter und Clear", async ({ page }) => {
    await page.goto("/#/search");

    const searchInput = page.getByRole("searchbox", { name: "Suche" }).first();
    await searchInput.fill("KONF.12.4");
    await searchInput.press("Enter");

    await expect(page).toHaveURL(/q=KONF\.12\.4/);

    await page.getByRole("button", { name: "Suche leeren" }).first().click();
    await expect(searchInput).toHaveValue("");
  });

  test("Theme-Toggle als Icon im Header und klickbarer Theme-Wechsel", async ({ page }) => {
    await page.goto("/#/search?q=KONF");

    const themeRoot = page.locator("html");
    const initialTheme = (await themeRoot.getAttribute("data-theme")) ?? "light";
    const nextTheme = initialTheme === "dark" ? "light" : "dark";
    const toggleLabel = initialTheme === "dark" ? "Hellmodus" : "Dunkelmodus";
    const nextToggleLabel = nextTheme === "dark" ? "Hellmodus" : "Dunkelmodus";

    const toggle = page.getByRole("button", { name: toggleLabel });
    await expect(page.locator(".app-bar-end .theme-toggle-button")).toHaveCount(1);
    await expect(toggle).toBeVisible();
    await toggle.click();

    await expect(themeRoot).toHaveAttribute("data-theme", nextTheme);
    await expect(page.getByRole("button", { name: nextToggleLabel })).toBeVisible();

    await page.getByRole("button", { name: "Weitere Aktionen" }).click();
    await expect(page.getByRole("menuitem", { name: /Nachtmodus|Tagmodus/ })).toHaveCount(0);
  });

  test("Debounce aktualisiert Suchzustand", async ({ page }) => {
    await page.goto("/#/search");
    const searchInput = page.getByRole("searchbox", { name: "Suche" }).first();
    await searchInput.fill("abc");
    await page.waitForTimeout(360);
    await expect(page).toHaveURL(/q=abc/);
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

  test("CSV Export disabled/enabled im Overflow", async ({ page }) => {
    await page.goto("/#/search?q=KONF");

    await page.getByRole("button", { name: "Weitere Aktionen" }).click();
    await expect(page.getByRole("menuitem", { name: "CSV exportieren" })).toBeDisabled();
    await page.keyboard.press("Escape");

    await page.getByRole("checkbox", { name: "Für CSV auswählen" }).first().check();

    await page.getByRole("button", { name: "Weitere Aktionen" }).click();
    await expect(page.getByRole("menuitem", { name: /CSV exportieren \(1\)/ })).toBeEnabled();
  });
});
