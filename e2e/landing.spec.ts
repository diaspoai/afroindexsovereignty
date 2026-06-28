import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("landing page", () => {
  test("hero renders the Africa map with all 12 CFA states highlighted", async ({ page }) => {
    await page.goto("/");
    const cfa = page.locator(".iafs-africa-map .cfa-state");
    await expect(cfa).toHaveCount(12);
    const isoCodes = await cfa.evaluateAll((els) => els.map((e) => e.getAttribute("data-iso3")).sort());
    expect(isoCodes).toEqual(["BEN","BFA","CAF","CIV","CMR","COG","GAB","MLI","NER","SEN","TCD","TGO"]);
  });

  test("hero headline split-colors the two axes — never blended", async ({ page }) => {
    await page.goto("/");
    const h1 = page.locator("h1").first();
    const axisASpan = h1.locator(".axis-A");
    const axisBSpan = h1.locator(".axis-B");
    await expect(axisASpan).toBeVisible();
    await expect(axisBSpan).toBeVisible();
    await expect(axisASpan).toContainText("Deux scores.");
    await expect(axisBSpan).toContainText("Jamais un.");
  });

  test("hero CTAs route to country profile and methodology", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: /Explorer un pays/i });
    await expect(cta).toHaveAttribute("href", "/country/ZZA");
    const cta2 = page.getByRole("link", { name: /Lire la méthodologie/i });
    await expect(cta2).toHaveAttribute("href", "/methodology");
  });

  test("gap-line section renders the 1960 baseline label and the dashed gap stroke", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".iafs-gapline .gap-stroke")).toHaveCount(1);
    await expect(page.getByText(/Indépendance sur le papier/i).first()).toBeVisible();
  });

  test("mini-trajectories render for each dummy country with at least one gap break", async ({ page }) => {
    await page.goto("/");
    const cards = page.locator(".iafs-mini");
    await expect(cards).toHaveCount(2);
    // Each MiniTrajectory has two paths (axis A indigo, axis B ochre).
    // At least one of the four total paths must have ≥2 M commands (a gap break).
    const ds = await page.locator(".iafs-mini svg path[data-axis]").evaluateAll(
      (els) => els.map((e) => e.getAttribute("d") ?? "")
    );
    expect(ds.length).toBe(4);
    const anyHasBreak = ds.some((d) => (d.match(/M/g) ?? []).length >= 2);
    expect(anyHasBreak, "at least one mini-trajectory path must break across gap years").toBe(true);
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

  test("GapLine respects prefers-reduced-motion (immediately visible, no animation)", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/");
    // With reduced motion, the inline script adds .visible immediately without animation.
    const gapline = page.locator(".iafs-gapline");
    await expect(gapline).toHaveClass(/visible/);
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
