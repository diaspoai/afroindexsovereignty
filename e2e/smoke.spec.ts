import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("R1 — FR home renders the cohort grid", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Carte/i);
  await expect(page.locator("ul li").first()).toBeVisible();
});

test("R8 — language switch lands on /en mirror", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /English/i }).click();
  await expect(page).toHaveURL(/\/en/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("R2 — A×B plot shows two axes, never combined", async ({ page }) => {
  await page.goto("/plot");
  await expect(page.getByText(/Two scores\. Never one\.|Deux scores\. Jamais un\./).first()).toBeVisible();
  const html = await page.content();
  expect(html).not.toMatch(/sovereignty_score|composite_score|combined_score/i);
});

test("R3 + R9 — ZZA country page renders scrubber with trajectory paths", async ({ page }) => {
  await page.goto("/country/ZZA");
  const svgPaths = page.locator("[data-scrubber] svg path[data-axis]");
  await expect(svgPaths).toHaveCount(2);
  const axes = await svgPaths.evaluateAll((els) => els.map((e) => e.getAttribute("data-axis")));
  expect(axes.sort()).toEqual(["A", "B"]);
});

test("R9 — trajectory paths break at gap years (no continuous line across nulls)", async ({ page }) => {
  await page.goto("/country/ZZB");
  const dB = await page.locator("[data-scrubber] svg path[data-axis='B']").getAttribute("d");
  expect(dB, "axis-B path attribute").toBeTruthy();
  const moveCount = (dB!.match(/M/g) ?? []).length;
  expect(moveCount, `axis-B path 'd' must restart at every gap, got d=${dB}`).toBeGreaterThanOrEqual(2);
});

test("R9 — baseline line is rendered and labeled", async ({ page }) => {
  await page.goto("/country/ZZA");
  await expect(page.locator(".trajectory-baseline")).toBeAttached();
  await expect(page.getByText(/Indépendance sur le papier/i).first()).toBeVisible();
});

test("R9 — gap year markers carry data-gap attribute", async ({ page }) => {
  await page.goto("/country/ZZB");
  const gaps = page.locator("[data-scrubber] g.year-marker[data-gap-a='true'], [data-scrubber] g.year-marker[data-gap-b='true']");
  expect(await gaps.count(), "ZZB axis-B has 1960–2009 as gap years").toBeGreaterThan(0);
});

test("R9 — scrubber updates the readout", async ({ page }) => {
  await page.goto("/country/ZZA");
  const range = page.locator("input[type='range']").first();
  await range.evaluate((el: HTMLInputElement) => { el.value = "1990"; el.dispatchEvent(new Event("input", { bubbles: true })); });
  await expect(page.locator("output").first()).toHaveText("1990");
});

test("a11y — home has no critical axe violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const critical = results.violations.filter((v) => v.impact === "critical");
  expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
});

test("a11y — country page has no critical axe violations", async ({ page }) => {
  await page.goto("/country/ZZA");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const critical = results.violations.filter((v) => v.impact === "critical");
  expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
});

test("no-composite — built site never renders a fused-score string", async ({ page }) => {
  for (const path of ["/", "/plot", "/country/ZZA", "/country/ZZB", "/events", "/methodology", "/download"]) {
    await page.goto(path);
    const html = await page.content();
    for (const tok of ["sovereignty_score","composite_score","combined_score","overall_score","total_score","fused_score"]) {
      expect(html, `${path} contains forbidden token ${tok}`).not.toContain(tok);
    }
  }
});
