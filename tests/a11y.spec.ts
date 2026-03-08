import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ROUTES = ["#/", "#/search?q=KONF.12.4", "#/about/license"];

test.describe("A11y smoke", () => {
  for (const route of ROUTES) {
    test(`hat keine kritischen AXE-Verstosse auf ${route}`, async ({ page }) => {
      await page.goto(`/${route}`);
      await page.waitForLoadState("networkidle");

      const results = await new AxeBuilder({ page }).analyze();
      const violations = results.violations.filter((violation) => {
        return ["critical", "serious"].includes(violation.impact ?? "");
      });

      expect(violations, JSON.stringify(violations, null, 2)).toHaveLength(0);
    });
  }

  test("hat keine kritischen AXE-Verstosse mit offenem Search Overlay", async ({ page }) => {
    await page.goto("/#/search?q=KONF");
    await page.getByRole("button", { name: "Suche öffnen" }).click();
    await expect(page.getByRole("dialog", { name: "Suche" })).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    const violations = results.violations.filter((violation) => {
      return ["critical", "serious"].includes(violation.impact ?? "");
    });

    expect(violations, JSON.stringify(violations, null, 2)).toHaveLength(0);
  });
});
