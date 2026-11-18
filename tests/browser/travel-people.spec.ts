import { test, expect, type Page } from "@playwright/test";
import type { AppState } from "../../src/domain/types";

const STORAGE_KEY = "tripwire.workspace.v3";
async function readWorkspace(page: Page): Promise<AppState> {
  await expect
    .poll(() =>
      page.evaluate((key) => localStorage.getItem(key) !== null, STORAGE_KEY),
    )
    .toBe(true);
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
}

async function addEmployee(page: Page, name: string, email: string) {
  await page.getByRole("button", { name: "Add employee", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Full name").fill(name);
  await dialog.getByLabel("Work email").fill(email);
  await dialog.getByLabel("Department").fill("Operations");
  await dialog.getByLabel("Home office").fill("Singapore");
  await dialog.getByLabel("Nationality").fill("Canadian");
  await dialog
    .getByRole("button", { name: "Add employee", exact: true })
    .click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}

test("employee numbers remain unique and stable when creating from a filtered directory and reloading", async ({
  page,
}) => {
  await page.goto("/employees");
  await page
    .getByLabel("Filter employees by department")
    .selectOption("Engineering");
  await addEmployee(page, "Morgan Lee", "morgan.lee@northstar.example");
  await expect(page.getByText("TW-EMP-000075", { exact: true })).toBeVisible();
  const firstUrl = page.url();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Morgan Lee", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("TW-EMP-000075", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(firstUrl);

  await page.goto("/employees");
  await addEmployee(page, "Taylor Nguyen", "taylor.nguyen@northstar.example");
  await expect(page.getByText("TW-EMP-000076", { exact: true })).toBeVisible();
  const state = await readWorkspace(page);
  expect(state.employees).toHaveLength(8);
  expect(
    new Set(state.employees.map((employee) => employee.employeeNumber)).size,
  ).toBe(8);
  expect(new Set(state.employees.map((employee) => employee.id)).size).toBe(8);
  expect(
    state.employees.find((employee) => employee.name === "Morgan Lee")
      ?.employeeNumber,
  ).toBe("TW-EMP-000075");
  expect(state.counters.employee).toBe(76);
});

test("a replacement preserves old versions and requires explicit case revalidation after review", async ({
  page,
}) => {
  await page.goto("/employees/employee-2");
  const before = await readWorkspace(page);
  const original = before.documents.find(
    (document) => document.id === "document-1",
  )!;
  expect(original.status).toBe("reviewed");
  expect(original.versions).toHaveLength(2);
  const passport = page
    .locator(".document-inventory-row")
    .filter({ has: page.getByText("Passport", { exact: true }) });
  await passport.getByRole("button", { name: "Update", exact: true }).click();
  const upload = page.getByRole("dialog");
  await upload
    .getByLabel("Replacement file")
    .setInputFiles({
      name: "Casey-passport-replacement.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 non-sensitive test metadata"),
    });
  await upload.getByLabel("Recorded expiry").fill("2034-06-30");
  await upload
    .getByRole("button", { name: "Record replacement", exact: true })
    .click();
  await expect(
    passport.getByText("Awaiting review", { exact: true }),
  ).toBeVisible();
  await expect(
    passport.getByText("Revalidation needed", { exact: true }),
  ).toBeVisible();
  let state = await readWorkspace(page);
  let current = state.documents.find(
    (document) => document.id === original.id,
  )!;
  expect(current.versions.slice(0, -1)).toEqual(original.versions);
  expect(current.versions).toHaveLength(3);
  expect(current.currentVersionId).not.toBe(original.currentVersionId);
  expect(current.status).toBe("submitted");
  expect(current.checkedAt).toBeUndefined();
  let linked = state.cases
    .find((item) => item.id === "assignment-2")!
    .requirements.find((requirement) => requirement.documentId === current.id)!;
  expect(linked.versionId).toBe(original.currentVersionId);
  expect(linked.status).toBe("correction");

  await page.reload();
  await expect(
    passport.getByText("Casey-passport-replacement.pdf", { exact: false }),
  ).toBeVisible();
  await page.goto("/documents?employee=employee-2&document=document-1");
  await expect(
    page.getByRole("dialog").getByText("Metadata preview", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.getByLabel("Filter documents by employee")).toHaveValue(
    "employee-2",
  );
  const documentRow = page
    .locator(".data-table tbody tr")
    .filter({
      has: page.getByRole("button", { name: "Passport", exact: true }),
    });
  await documentRow
    .getByRole("button", { name: "Review", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Review note")
    .fill(
      "Checked the replacement passport details and recorded expiry. Case use requires a separate check.",
    );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Record review", exact: true })
    .click();
  await expect(
    documentRow.getByText("Reviewed", { exact: true }),
  ).toBeVisible();
  state = await readWorkspace(page);
  current = state.documents.find((document) => document.id === original.id)!;
  linked = state.cases
    .find((item) => item.id === "assignment-2")!
    .requirements.find((requirement) => requirement.documentId === current.id)!;
  expect(current.status).toBe("reviewed");
  expect(
    current.versions.find((version) => version.id === current.currentVersionId)
      ?.status,
  ).toBe("reviewed");
  expect(linked.status).toBe("correction");
  expect(linked.versionId).toBe(original.currentVersionId);
});

test("entry and exit 30, 90 and 180 day windows select dates rather than stay length", async ({
  page,
}) => {
  await page.goto("/travel");
  const cases = () =>
    page
      .locator('.travel-table tbody tr td:first-child a[href^="/cases/"]')
      .allTextContents();
  const expected: Record<string, number[]> = {
    entry30: [143, 144, 145, 146, 147],
    exit30: [143, 144, 145, 145, 146],
    entry90: [143, 144, 145, 146, 147, 148],
    exit90: [142, 143, 144, 145, 145, 146, 147, 148],
    entry180: [143, 144, 145, 146, 147, 148],
    exit180: [142, 143, 144, 145, 145, 146, 147, 148],
  };
  for (const [window, numbers] of Object.entries(expected)) {
    await test.step(window, async () => {
      await page
        .getByLabel("Date window", { exact: true })
        .selectOption(window);
      await expect(page.locator(".travel-table tbody tr")).toHaveCount(
        numbers.length,
      );
      expect((await cases()).map((text) => text.trim()).sort()).toEqual(
        numbers
          .map((number) => `TW-CASE-${String(number).padStart(6, "0")}`)
          .sort(),
      );
    });
  }
  // The 184-day placement is included by its December exit, despite exceeding a 180-day stay.
  await expect(
    page
      .locator(".travel-table tbody tr")
      .filter({ hasText: "TW-CASE-000142" }),
  ).toContainText("184 planned days");
});

test("a company return extension logs approval and preserves permission expiry", async ({
  page,
}) => {
  await page.goto("/travel");
  const before = await readWorkspace(page);
  const original = before.trips.find((trip) => trip.id === "trip-casey-work")!;
  const casey = page
    .locator(".travel-table tbody tr")
    .filter({ hasText: "TW-CASE-000142" });
  await expect(
    casey.getByText("Past approved return date", { exact: true }),
  ).toBeVisible();
  await casey
    .getByRole("button", { name: "Extend return", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Permission expiry stays Jan 15, 2027");
  await dialog.getByLabel("New approved return").fill("2026-10-25");
  await dialog.getByLabel("Approval date").fill("2026-10-20");
  await dialog.getByLabel("Approved by").fill("Jeffrey Tang");
  await dialog
    .getByLabel("Approval note")
    .fill("Department head approved the revised meeting schedule.");
  await dialog
    .getByRole("button", { name: "Record approved extension", exact: true })
    .click();
  await expect(
    casey.getByText("Within approved dates", { exact: true }),
  ).toBeVisible();
  const state = await readWorkspace(page);
  const extended = state.trips.find((trip) => trip.id === original.id)!;
  expect(extended.approvedReturn).toBe("2026-10-25");
  expect(extended.permissionExpiry).toBe(original.permissionExpiry);
  expect(extended.actualEntry).toBe(original.actualEntry);
  expect(extended.plannedExit).toBe(original.plannedExit);
  expect(
    state.history.some(
      (event) =>
        event.caseId === original.caseId &&
        event.message.includes("approved by Jeffrey Tang on 2026-10-20") &&
        event.message.includes(
          "Department head approved the revised meeting schedule.",
        ) &&
        event.message.includes("Permission expiry unchanged"),
    ),
  ).toBe(true);
  await page.reload();
  await expect(
    casey.getByText("Within approved dates", { exact: true }),
  ).toBeVisible();
  expect(
    (await readWorkspace(page)).trips.find((trip) => trip.id === original.id)
      ?.permissionExpiry,
  ).toBe(original.permissionExpiry);
});

test("actual entry and exit count inclusively while planned days remain separate", async ({
  page,
}) => {
  await page.goto("/travel");
  const olivia = page
    .locator(".travel-table tbody tr")
    .filter({ hasText: "TW-CASE-000144" });
  await expect(
    olivia.getByText("0 actual days", { exact: true }),
  ).toBeVisible();
  const actualYtd = page
    .locator(".metric-grid > .card")
    .filter({ hasText: "Actual days abroad YTD" })
    .locator(".metric-value");
  const beforeYtd = Number(await actualYtd.textContent());
  await olivia
    .getByRole("button", { name: "Record travel", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Actual entry").fill("2026-10-19");
  await dialog.getByLabel("Actual exit").fill("2026-10-20");
  await dialog.getByLabel("Daily budget").fill("200");
  await dialog.getByLabel("Currency").fill("GBP");
  await dialog
    .getByRole("button", { name: "Save travel record", exact: true })
    .click();
  await expect(
    olivia.getByText("2 actual days", { exact: true }),
  ).toBeVisible();
  await expect(
    olivia.getByText("6 planned days", { exact: true }),
  ).toBeVisible();
  await expect(actualYtd).toHaveText(String(beforeYtd + 2));
  const state = await readWorkspace(page);
  const trip = state.trips.find((trip) => trip.id === "trip-olivia")!;
  expect(trip.actualEntry).toBe("2026-10-19");
  expect(trip.actualExit).toBe("2026-10-20");
  expect(trip.plannedEntry).toBe("2026-10-20");
  expect(trip.plannedExit).toBe("2026-10-25");
  expect(trip.dailyBudget).toBe(200);
  expect(trip.currency).toBe("GBP");
});

test("extra cost remains unavailable without a budget and uses only the entered currency estimate", async ({
  page,
}) => {
  await page.goto("/travel");
  const casey = page
    .locator(".travel-table tbody tr")
    .filter({ hasText: "TW-CASE-000142" });
  await expect(casey).toContainText("2 days beyond approved return");
  await casey
    .getByRole("button", { name: "Record travel", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Daily budget").fill("");
  await dialog.getByLabel("Currency").fill("");
  await dialog
    .getByRole("button", { name: "Save travel record", exact: true })
    .click();
  await expect(casey).toContainText("Estimate: Not available");
  await expect(casey).not.toContainText("$0");
  await casey
    .getByRole("button", { name: "Record travel", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Daily budget").fill("100");
  await dialog.getByLabel("Currency").fill("USD");
  await dialog
    .getByRole("button", { name: "Save travel record", exact: true })
    .click();
  await expect(casey).toContainText("Estimate: $200");
  const trip = (await readWorkspace(page)).trips.find(
    (trip) => trip.id === "trip-casey-work",
  )!;
  expect(trip.dailyBudget).toBe(100);
  expect(trip.currency).toBe("USD");
  expect(trip.approvedReturn).toBe("2026-10-18");
  expect(trip.permissionExpiry).toBe("2027-01-15");
});
