import { test, expect } from "@playwright/test";
const KEY = "tripwire.workspace.v3";
test("overview presents actions first and header routes work", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Good morning, Jeffrey." }),
  ).toBeVisible();
  await expect(page.getByText("Active abroad", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Reset scope")).toHaveCount(0);
  const queue = await page
    .getByRole("heading", { name: "Today’s priorities" })
    .boundingBox();
  const chart = await page
    .getByRole("heading", { name: "The bigger picture" })
    .boundingBox();
  expect(queue!.y).toBeLessThan(chart!.y);
  await page.getByRole("link", { name: "2 Urgent issues" }).click();
  await expect(page).toHaveURL(/urgent/);
  expect(errors).toEqual([]);
});
test("legacy assignment route preserves params and old work purpose", async ({
  page,
}) => {
  await page.goto("/assignments/assignment-2?tab=history");
  await expect(page).toHaveURL("/cases/assignment-2?tab=history");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Casey Chen",
  );
  await expect(page.locator("main")).toContainText(
    "Six-month technical engineering placement",
  );
  await expect(page.locator("main")).not.toContainText(
    "Preserved preparation action",
  );
});
test("employee replies stay separate from internal notes and persist", async ({
  page,
}) => {
  await page.goto("/inbox?thread=thread-passport");
  await expect(page.locator("main")).toContainText(
    "Which passport page do you need?",
  );
  await expect(page.locator("main")).not.toContainText(
    "hands-on line commissioning",
  );
  const textarea = page.locator("textarea");
  await textarea.fill(
    "Please use the current photo page; we will check the selected route criteria.",
  );
  await page
    .getByRole("button", {
      name: /Record reply|Post reply|Send reply|Reply to employee/,
    })
    .click();
  await expect(page.locator(".messages")).toContainText(
    "Please use the current photo page",
  );
  await page.reload();
  await expect(page.locator(".messages")).toContainText(
    "Please use the current photo page",
  );
  await page.getByRole("tab", { name: /^Internal/ }).click();
  await expect(page.locator("main")).toContainText(
    "Casey placement: work-route assessment",
  );
  await expect(page.locator(".messages")).not.toContainText(
    "Please use the current photo page",
  );
});
test("urgent acknowledgment keeps incident unresolved; resolve and reopen update counts", async ({
  page,
}) => {
  await page.goto("/urgent?incident=incident-airport");
  await page.getByRole("button", { name: "Acknowledge", exact: true }).click();
  let s = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), KEY);
  expect(
    s.incidents.filter((i: { status: string }) => i.status !== "resolved"),
  ).toHaveLength(2);
  await expect(
    page.getByRole("dialog").getByText("Acknowledged", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Start response|Start working/ })
    .click();
  await page.getByRole("button", { name: /Resolve with note/ }).click();
  await page
    .locator("textarea")
    .fill(
      "Recorded the passport-linked details and employee confirmed receipt. Carrier decision remains external.",
    );
  await page
    .getByRole("button", {
      name: /Confirm resolution|Save resolution|Resolve incident/,
    })
    .last()
    .click();
  s = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), KEY);
  expect(
    s.incidents.find((i: { id: string }) => i.id === "incident-airport").status,
  ).toBe("resolved");
  await page.getByRole("button", { name: /Reopen/ }).click();
  s = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), KEY);
  expect(
    s.incidents.find((i: { id: string }) => i.id === "incident-airport").status,
  ).toBe("open");
});
test("guide starts the same route template and distinguishes ETA from visa", async ({
  page,
}) => {
  await page.goto("/guide");
  await expect(
    page.getByRole("heading", { name: "Travel guide", exact: true }),
  ).toBeVisible();
  await page
    .locator(".guide-card")
    .filter({ hasText: "ETA" })
    .getByRole("button", { name: "Read guide" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("GBP20");
  await expect(page.getByRole("dialog")).toContainText("Official sources");
  await page.getByRole("link", { name: "Start case using this guide" }).click();
  await expect(page).toHaveURL(/cases\/new\?route=uk-eta/);
});
test("modal focus trap, Escape, reduced motion, reset and corrupt storage recovery", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/settings");
  await page
    .getByRole("button", { name: "Reset demo workspace", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  expect(
    await page
      .getByRole("dialog")
      .evaluate((el) => el.contains(document.activeElement)),
  ).toBeTruthy();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate((k) => localStorage.setItem(k, "{bad json"), KEY);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Workspace settings" }),
  ).toBeVisible();
  const quarantine = await page.evaluate(() =>
    Object.keys(localStorage).filter((k) => k.includes(".quarantine.")),
  );
  expect(quarantine.length).toBe(1);
  await page
    .getByRole("button", { name: "Reset demo workspace", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm reset", exact: true })
    .click();
  const s = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)!),
    KEY,
  );
  expect(s.cases.length).toBe(8);
  expect(s.profile.name).toBe("Jeffrey Tang");
});
for (const viewport of [
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 720, height: 450 },
])
  test(`viewport ${viewport.width} layout and keyboard navigation`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Skip to content" }),
    ).toBeFocused();
    if (viewport.width >= 1280)
      await expect(
        page.getByRole("link", { name: "New case", exact: true }),
      ).toBeVisible();
    await page.screenshot({
      path: `test-results/overview-${viewport.width}.png`,
      fullPage: true,
    });
    await page.goto("/cases/case-vn-meetings");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `test-results/case-${viewport.width}.png`,
      fullPage: true,
    });
  });
