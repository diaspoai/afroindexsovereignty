import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("landing page · v2", () => {
  test("hero renders the Africa map with all 12 CFA states highlighted", async ({ page }) => {
    await page.goto("/");
    const cfa = page.locator(".iafs-africa-map .cfa-state");
    await expect(cfa).toHaveCount(12);
    const isoCodes = await cfa.evaluateAll((els) => els.map((e) => e.getAttribute("data-iso3")).sort());
    expect(isoCodes).toEqual(["BEN","BFA","CAF","CIV","CMR","COG","GAB","MLI","NER","SEN","TCD","TGO"]);
  });

  test("UEMOA states and CEMAC states have distinct fills (zone-not-score)", async ({ page }) => {
    await page.goto("/");
    const uemoa = page.locator('.iafs-africa-map .cfa-state[data-zone="UEMOA"]');
    const cemac = page.locator('.iafs-africa-map .cfa-state[data-zone="CEMAC"]');
    await expect(uemoa).toHaveCount(7);
    await expect(cemac).toHaveCount(5);
    const uemoaFill = await uemoa.first().locator("path").evaluate((el) => el.getAttribute("fill"));
    const cemacFill = await cemac.first().locator("path").evaluate((el) => el.getAttribute("fill"));
    expect(uemoaFill).not.toBe(cemacFill);
    expect(uemoaFill).toContain("74"); // indigo soft = rgb(74 107 214)
    expect(cemacFill).toContain("217"); // amber soft = rgb(217 147 32)
  });

  test("zone legend chips are present and labeled", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-zone-chip="UEMOA"]')).toBeVisible();
    await expect(page.locator('[data-zone-chip="CEMAC"]')).toBeVisible();
  });

  test("hovering a CFA state updates the side panel", async ({ page }) => {
    await page.goto("/");
    const detailName = page.locator("[data-detail-name]");
    await expect(detailName).toHaveText("—"); // default
    const firstState = page.locator('.iafs-africa-map .cfa-state').first();
    await firstState.hover();
    await expect(detailName).not.toHaveText("—");
    await expect(page.locator("[data-detail-meta]")).toContainText(/UEMOA|CEMAC/);
  });

  test("clicking a state locks the side panel; Esc releases it", async ({ page }) => {
    await page.goto("/");
    const path = page.locator('.iafs-africa-map .cfa-state').first().locator("path");
    await path.click();
    await expect(page.locator('.iafs-africa-map .cfa-state[data-active="true"]')).toHaveCount(1);
    await expect(page.locator("[data-detail-dismiss]")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('.iafs-africa-map .cfa-state[data-active="true"]')).toHaveCount(0);
  });

  test("clicking the UEMOA zone chip triggers a pulse on UEMOA states only", async ({ page }) => {
    await page.goto("/");
    await page.locator('[data-zone-chip="UEMOA"]').click();
    const pulsing = page.locator('.iafs-africa-map .cfa-state[data-pulsing="true"]');
    // Pulse is brief; assert at least one UEMOA state got the attribute
    expect(await pulsing.count()).toBeGreaterThan(0);
    const zones = await pulsing.evaluateAll((els) => els.map((e) => e.getAttribute("data-zone")));
    expect(zones.every((z) => z === "UEMOA")).toBe(true);
  });

  test("CFA-state paths are keyboard-focusable", async ({ page }) => {
    await page.goto("/");
    const firstPath = page.locator('.iafs-africa-map .cfa-state').first().locator("path");
    await firstPath.focus();
    await expect(firstPath).toBeFocused();
    // Focus reveals the detail panel
    await expect(page.locator("[data-detail-name]")).not.toHaveText("—");
  });

  test("hero headline split-colors the two axes — never blended", async ({ page }) => {
    await page.goto("/");
    const h1 = page.locator("h1").first();
    await expect(h1.locator(".axis-A")).toContainText("Deux scores.");
    await expect(h1.locator(".axis-B")).toContainText("Jamais un.");
  });

  test("hero CTAs route to country profile and methodology", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Explorer un pays/i })).toHaveAttribute("href", /^\/country\/[A-Z]{3}$|^\/countries$/);
    await expect(page.getByRole("link", { name: /Lire la méthodologie/i })).toHaveAttribute("href", "/methodology");
  });

  test("gap-line section renders coral baseline label + dashed gap stroke", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".iafs-gapline .gap-stroke")).toHaveCount(1);
    await expect(page.getByText(/Indépendance sur le papier/i).first()).toBeVisible();
  });

  test("mini-trajectories: one card per country, two axis paths each", async ({ page }) => {
    await page.goto("/");
    const cards = page.locator(".iafs-mini");
    const cardCount = await cards.count();
    expect(cardCount, "at least one country with a trajectory").toBeGreaterThan(0);
    const ds = await page.locator(".iafs-mini svg path[data-axis]").evaluateAll(
      (els) => els.map((e) => e.getAttribute("d") ?? "")
    );
    // Two paths per card (axis A + axis B)
    expect(ds.length).toBe(cardCount * 2);
  });

  test("three commitment cards link to methodology", async ({ page }) => {
    await page.goto("/");
    const cards = page.locator(".iafs-commitment");
    await expect(cards).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect(cards.nth(i)).toHaveAttribute("href", "/methodology");
    }
  });

  test("audit strip links to repo, methodology, and events", async ({ page }) => {
    await page.goto("/");
    const audit = page.locator(".iafs-audit");
    await expect(audit.getByRole("link", { name: /Dépôt GitHub/i })).toHaveAttribute("href", /github\.com\/diaspoai\/afroindexsovereignty/);
    await expect(audit.getByRole("link", { name: /Méthodologie complète/i })).toHaveAttribute("href", "/methodology");
    await expect(audit.getByRole("link", { name: /Journal d'événements/i })).toHaveAttribute("href", "/events");
  });

  test("FR ↔ EN parity — EN landing has the same 12 highlighted states + headline split", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator(".iafs-africa-map .cfa-state")).toHaveCount(12);
    const h1 = page.locator("h1").first();
    await expect(h1.locator(".axis-A")).toContainText("Two scores.");
    await expect(h1.locator(".axis-B")).toContainText("Never one.");
  });

  test("GapLine respects prefers-reduced-motion", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator(".iafs-gapline")).toHaveClass(/visible/);
    await ctx.close();
  });

  test("landing has no critical axe violations (FR)", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
  });

  test("landing has no critical axe violations (EN)", async ({ page }) => {
    await page.goto("/en");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
  });
});
