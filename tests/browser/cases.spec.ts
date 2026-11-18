import { test, expect, type Locator, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { AppState, Case } from "../../src/domain/types";
import { inWindow } from "../../src/domain/dates";

const STORAGE_KEY = "tripwire.workspace.v3";
const errors = new WeakMap<Page, string[]>();

test.beforeEach(({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on("pageerror", (error) => messages.push(error.message));
});
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));

const workspace = (page: Page): Promise<AppState> =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
const requirement = (page: Page, name: string) =>
  page
    .locator(".checklist-item")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
const currentCase = async (page: Page): Promise<Case> => {
  const id = new URL(page.url()).pathname.split("/").at(-1);
  return (await workspace(page)).cases.find((item) => item.id === id)!;
};
const visibleCaseIds = (page: Page) =>
  page
    .locator("tbody .case-employee-link")
    .evaluateAll((links) =>
      links
        .map(
          (link) =>
            new URL((link as HTMLAnchorElement).href).pathname
              .split("/")
              .at(-1)!,
        )
        .sort(),
    );

async function usePreset(page: Page) {
  await page.goto("/cases/new");
  await page
    .getByRole("button", { name: "Use business-trip preset", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Tell us about the trip", exact: true }),
  ).toBeVisible();
}

async function createFromReview(page: Page) {
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("checkbox", {
      name: "I reviewed these details and understand that the proposed route needs confirmation.",
    })
    .check();
  await page.getByRole("button", { name: "Create case", exact: true }).click();
  await expect(page).toHaveURL(/\/cases\/case-\d+$/);
  await expect(
    page.getByRole("heading", { name: "Application checklist", exact: true }),
  ).toBeVisible();
  return currentCase(page);
}

async function uploadAndReview(
  page: Page,
  row: Locator,
  fileName: string,
  replacement = false,
) {
  await row
    .getByRole("button", {
      name: replacement ? "Upload replacement" : "Upload document",
      exact: true,
    })
    .click();
  const upload = page.getByRole("dialog");
  await upload.getByLabel("Document file").setInputFiles({
    name: fileName,
    mimeType: fileName.endsWith(".jpg") ? "image/jpeg" : "application/pdf",
    buffer: Buffer.from("Non-sensitive sample document metadata"),
  });
  await upload
    .getByRole("button", { name: "Save for review", exact: true })
    .click();
  await expect(row).toContainText("Awaiting review");
  await row.getByRole("button", { name: "Review", exact: true }).click();
  const review = page.getByRole("dialog");
  await review
    .getByLabel("I checked the current version", { exact: false })
    .check();
  await review
    .getByRole("button", { name: "Accept document check", exact: true })
    .click();
  await expect(row).toContainText("Completed");
}

async function prepareEvisa(page: Page) {
  await page.goto("/cases/case-vn-evisa");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Daniel Kim",
  );
  await uploadAndReview(
    page,
    requirement(page, "Portrait for e-visa application"),
    "portrait-update.jpg",
    true,
  );
  await requirement(page, "TripWire application preparation draft")
    .getByRole("button", { name: "View draft", exact: true })
    .click();
  const draft = page.getByRole("dialog");
  await draft.getByLabel(/^Passport number/).fill("SAMPLE-ONLY-1026");
  await draft
    .getByLabel(/^Intended entry \/ exit point/)
    .fill("Tan Son Nhat airport");
  await draft
    .getByLabel(/^Accommodation address/)
    .fill("Host-arranged hotel, Ho Chi Minh City");
  await draft
    .getByRole("button", { name: "Save completed preparation", exact: true })
    .click();
  await draft
    .getByRole("button", { name: "Close dialog", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await currentCase(page)).requirements.find(
          (item) => item.name === "TripWire application preparation draft",
        )?.status,
    )
    .toBe("completed");
  expect((await currentCase(page)).decision).toBeUndefined();
  await requirement(page, "Official submission reference")
    .getByRole("button", { name: "Record submission", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toContainText(
    "Unresolved required steps",
  );
}

test("case queries match their queues, and row links preserve selection and checkbox behavior", async ({
  page,
}) => {
  await page.goto("/cases");
  await expect(
    page.getByRole("heading", { name: "Cases", exact: true }),
  ).toBeVisible();
  const initial = await workspace(page);
  const all = initial.cases.map((item) => item.id).sort();
  const incomplete = (item: Case) =>
    item.requirements.some(
      (row) =>
        row.kind === "required" &&
        row.status !== "completed" &&
        row.status !== "na",
    );
  const documentsReady = (item: Case) =>
    item.requirements
      .filter((row) => row.stage === "documents" && row.kind === "required")
      .every((row) => row.status === "completed" || row.status === "na");
  await page.goto("/cases?queue=departing");
  await expect(page.getByLabel("Case queue")).toHaveValue("departing");
  await expect
    .poll(() => visibleCaseIds(page))
    .toEqual(
      initial.cases
        .filter(
          (item) => inWindow(item.start, initial.clock, 3) && incomplete(item),
        )
        .map((item) => item.id)
        .sort(),
    );
  await expect(page.locator("tbody")).toContainText("Date only");
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect.poll(() => visibleCaseIds(page)).toEqual(all);
  await page.goto("/cases?stage=preparing");
  const preparing = await visibleCaseIds(page);
  expect(preparing).toEqual(
    initial.cases
      .filter((item) => !documentsReady(item))
      .map((item) => item.id)
      .sort(),
  );
  await page.goto("/cases?stage=ready");
  const ready = await visibleCaseIds(page);
  expect(ready).toEqual(
    initial.cases
      .filter(documentsReady)
      .map((item) => item.id)
      .sort(),
  );
  expect(preparing.filter((id) => ready.includes(id))).toEqual([]);
  expect([...preparing, ...ready].sort()).toEqual(all);

  await page.goto("/cases");
  const row = page
    .locator("tbody tr")
    .filter({
      has: page.getByRole("link", { name: "Casey Chen", exact: true }),
    })
    .first();
  const link = row.getByRole("link", { name: "Casey Chen", exact: true });
  const href = await link.getAttribute("href");
  await expect(row).toContainText(/TW-CASE-\d{6}/);
  await expect(row).not.toHaveAttribute("role", "button");
  await row.getByRole("checkbox").check();
  await expect(page).toHaveURL("/cases");
  await expect(page.locator(".selection-bar")).toContainText("1 selected");
  const text = await row.locator("td").nth(2).locator("strong").boundingBox();
  expect(text).not.toBeNull();
  await page.mouse.move(text!.x + 1, text!.y + text!.height / 2);
  await page.mouse.down();
  await page.mouse.move(text!.x + text!.width - 1, text!.y + text!.height / 2, {
    steps: 10,
  });
  await page.mouse.up();
  expect(
    await page.evaluate(() => window.getSelection()?.toString().length),
  ).toBeGreaterThan(0);
  await expect(page).toHaveURL("/cases");
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  await row
    .locator("td")
    .nth(3)
    .click({ position: { x: 5, y: 5 } });
  await expect(page).toHaveURL(href!);
  await page.goto("/cases");
  await link.focus();
  await expect(link).toBeFocused();
  await link.press("Enter");
  await expect(page).toHaveURL(href!);
});

test("short Vietnam intake reuses a passport, requests a named photo and exports an honest blocked dossier", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await usePreset(page);
  const created = await createFromReview(page);
  expect(created.route).toBe("vn-dn1");
  expect(created.routeConfirmed).toBe(false);
  expect(created.intake?.activityDetail).toContain(
    "No hands-on technical work",
  );
  await page
    .getByRole("button", { name: "Confirm route", exact: true })
    .click();
  const assessment = page.getByRole("dialog");
  await expect(
    assessment.getByRole("button", {
      name: "Record route assessment",
      exact: true,
    }),
  ).toBeDisabled();
  await assessment
    .getByLabel(/^Basis for route assessment/)
    .fill(
      "Checked nationality/current permission, meetings only, established host identity and current issuing-office guidance.",
    );
  await assessment
    .getByLabel("I have checked this proposed route", { exact: false })
    .check();
  await assessment
    .getByRole("button", { name: "Record route assessment", exact: true })
    .click();
  await requirement(page, "Passport photo page")
    .getByRole("button", { name: "Use document on file", exact: true })
    .click();
  await expect(requirement(page, "Passport photo page")).toContainText(
    "Completed",
  );
  const photo = requirement(page, "Visa photograph(s)");
  await photo.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Request selected (1)", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await workspace(page)).threads.filter(
          (thread) =>
            thread.caseId === created.id && thread.audience === "employee",
        ).length,
    )
    .toBe(1);
  const request = (await workspace(page)).threads.find(
    (thread) => thread.caseId === created.id && thread.audience === "employee",
  )!;
  expect(request.requirementIds).toEqual([
    created.requirements.find((item) => item.documentType === "photo")!.id,
  ]);
  expect(request.messages[0].body).toContain("Visa photograph(s)");

  await requirement(page, "TripWire application preparation draft")
    .getByRole("button", { name: "Prepare draft", exact: true })
    .click();
  const draft = page.getByRole("dialog");
  await expect(draft.getByLabel(/^Passport number/)).toHaveValue("");
  await draft.getByLabel(/^Passport number/).fill("SAMPLE-CASEY-1026");
  await draft
    .getByLabel(/^Visa collection \/ issuing office/)
    .fill(
      "Vietnam Embassy, Washington DC — current office instructions to confirm",
    );
  await draft
    .getByLabel(/^Current permission or exemption/)
    .fill("No existing entry permission; confirmed with traveler");
  await draft.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(
    draft.getByRole("heading", {
      name: "Application field summary",
      exact: true,
    }),
  ).toBeVisible();
  await expect(draft).toContainText("SAMPLE-CASEY-1026");
  const downloading = page.waitForEvent("download");
  await draft
    .getByRole("button", { name: "Export sheet + dossier index", exact: true })
    .click();
  const download = await downloading;
  const output = testInfo.outputPath("preparation-sheet-and-dossier.html");
  await download.saveAs(output);
  const html = await readFile(output, "utf8");
  expect(html).toContain("TripWire preparation draft");
  expect(html).toContain("Dossier checklist / index");
  expect(html).toContain("not an official application");
  expect(html).toContain("Current official form-field mapping is unavailable");
  expect(html).toContain("https://");
  await draft.getByRole("button", { name: "Save draft", exact: true }).click();
  await draft
    .getByRole("button", { name: "Close dialog", exact: true })
    .click();

  for (const [name, file] of [
    ["Signed / submitted sponsor request record", "signed-sponsor-request.pdf"],
    ["Returned sponsor entry approval", "returned-sponsor-approval.pdf"],
  ]) {
    await uploadAndReview(page, requirement(page, name), file);
  }
  await expect(
    requirement(page, "Authority decision and validity record"),
  ).toContainText("Not started");
  await requirement(page, "Official submission reference")
    .getByRole("button", { name: "Record submission", exact: true })
    .click();
  const handoff = page.getByRole("dialog");
  await expect(handoff).toContainText("Unresolved required steps");
  await expect(
    handoff.getByRole("button", { name: "Record submission", exact: true }),
  ).toBeDisabled();
  await handoff.getByRole("button", { name: "Close", exact: true }).click();
  expect((await currentCase(page)).submission).toBeUndefined();
  expect((await currentCase(page)).decision).toBeUndefined();
  await page.reload();
  await expect(requirement(page, "Passport photo page")).toContainText(
    "Completed",
  );
  await expect
    .poll(async () => (await currentCase(page)).draft?.fields.passportNumber)
    .toBe("SAMPLE-CASEY-1026");
});

test("manual authority records require reference, date, actor and separate decision confirmation", async ({
  page,
}) => {
  await prepareEvisa(page);
  const handoff = page.getByRole("dialog");
  const record = handoff.getByRole("button", {
    name: "Record submission",
    exact: true,
  });
  await expect(record).toBeDisabled();
  await handoff
    .getByLabel("I confirm this submission already occurred", { exact: false })
    .check();
  await expect(record).toBeDisabled();
  await handoff
    .getByLabel("Actual submission reference")
    .fill("RECORDED-EXTERNAL-RECEIPT-1026");
  await handoff.getByLabel("Submitted by").fill("");
  await expect(record).toBeDisabled();
  await handoff.getByLabel("Submitted by").fill("Daniel Kim");
  const date = (await workspace(page)).clock.slice(0, 10);
  await handoff.getByLabel("Submission date").fill("");
  await expect(record).toBeDisabled();
  await handoff.getByLabel("Submission date").fill(date);
  await record.click();
  await expect
    .poll(async () => (await currentCase(page)).submission?.reference)
    .toBe("RECORDED-EXTERNAL-RECEIPT-1026");
  expect((await currentCase(page)).submission).toEqual({
    reference: "RECORDED-EXTERNAL-RECEIPT-1026",
    date,
    actor: "Daniel Kim",
    simulated: false,
  });
  expect((await currentCase(page)).decision).toBeUndefined();
  await requirement(page, "Authority decision and validity record")
    .getByRole("button", { name: "Add decision", exact: true })
    .click();
  const decision = page.getByRole("dialog");
  await expect(
    decision.getByRole("button", { name: "Save decision record", exact: true }),
  ).toBeDisabled();
  await decision
    .getByLabel("Authority result / document reference")
    .fill("RECORDED-EXTERNAL-RESULT-1026");
  await decision.getByLabel("Permission valid from").fill("2026-10-21");
  await decision.getByLabel("Permission valid until").fill("2026-10-28");
  await decision
    .getByLabel("I checked the externally received result", { exact: false })
    .check();
  await decision
    .getByRole("button", { name: "Save decision record", exact: true })
    .click();
  await expect
    .poll(async () => (await currentCase(page)).decision?.simulated)
    .toBe(false);
  await page.reload();
  await expect(
    requirement(page, "Authority decision and validity record"),
  ).toContainText("Completed");
  const saved = await currentCase(page);
  expect(saved.decision?.reference).toBe("RECORDED-EXTERNAL-RESULT-1026");
  expect(
    (await workspace(page)).history.some(
      (event) =>
        event.caseId === saved.id &&
        event.message.includes("TripWire did not file or pay"),
    ),
  ).toBe(true);
});

test("demo submission remains explicit and cannot produce an unmarked authority decision", async ({
  page,
}) => {
  await prepareEvisa(page);
  const handoff = page.getByRole("dialog");
  await handoff.getByText("Demo controls", { exact: true }).click();
  await handoff
    .getByLabel("Record a simulated submission for the demonstration")
    .check();
  await expect(handoff).toContainText(
    "No government application or payment will occur",
  );
  await handoff
    .getByLabel("I understand this creates only a simulated local record.")
    .check();
  await handoff
    .getByRole("button", { name: "Record demo reference", exact: true })
    .click();
  await expect
    .poll(async () => (await currentCase(page)).submission?.simulated)
    .toBe(true);
  expect((await currentCase(page)).decision).toBeUndefined();
  await requirement(page, "Official submission reference")
    .getByRole("button", { name: "View submission record", exact: true })
    .click();
  const existing = page.getByRole("dialog");
  await existing.getByText("Demo controls", { exact: true }).click();
  await expect(
    existing.getByLabel("Record a simulated submission for the demonstration"),
  ).toBeChecked();
  await expect(existing).toContainText("Demo simulated record");
  await existing.getByRole("button", { name: "Close", exact: true }).click();
  await requirement(page, "Authority decision and validity record")
    .getByRole("button", { name: "Add decision", exact: true })
    .click();
  const decision = page.getByRole("dialog");
  await decision
    .getByLabel("Authority result / document reference")
    .fill("DEMO-RESULT-1026");
  await decision.getByLabel("Permission valid from").fill("2026-10-21");
  await decision.getByLabel("Permission valid until").fill("2026-10-28");
  await decision
    .getByLabel("I checked the externally received result", { exact: false })
    .check();
  await decision
    .getByRole("button", { name: "Save decision record", exact: true })
    .click();
  await expect(decision).toContainText(
    "A simulated submission can only have a simulated decision",
  );
  expect((await currentCase(page)).decision).toBeUndefined();
  await decision.getByText("Demo controls", { exact: true }).click();
  await decision
    .getByLabel("Record a simulated decision", { exact: true })
    .check();
  await decision
    .getByLabel("I understand this records only a simulated result.")
    .check();
  await decision
    .getByRole("button", { name: "Save decision record", exact: true })
    .click();
  await expect
    .poll(async () => (await currentCase(page)).decision?.simulated)
    .toBe(true);
  await requirement(page, "Before-departure checks")
    .getByRole("button", { name: "Mark checked", exact: true })
    .click();
  const departure = page.getByRole("dialog");
  await departure
    .getByLabel(/^Check record/)
    .fill(
      "Demonstration check of recorded dates, current passport, itinerary, host contact and company-approved return.",
    );
  await departure
    .getByLabel("I confirmed this requirement", { exact: false })
    .check();
  await departure
    .getByRole("button", { name: "Record check", exact: true })
    .click();
  await page.reload();
  await expect(requirement(page, "Before-departure checks")).toContainText(
    "Completed",
  );
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.locator("main")).toContainText("demo simulated");

  // A new passport must invalidate its dependent preparation/result acceptance,
  // while retaining the earlier authority record for history.
  const beforeReplacement = await currentCase(page);
  const passportId = beforeReplacement.requirements.find(
    (item) => item.documentType === "passport",
  )!.documentId!;
  await page.goto(`/documents?document=${passportId}`);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Upload replacement", exact: true })
    .click();
  const replacement = page.getByRole("dialog");
  await replacement.getByLabel(/^Replacement file/).setInputFiles({
    name: "Daniel-replacement-passport.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("Non-sensitive replacement passport metadata"),
  });
  await replacement.getByLabel(/^Recorded expiry/).fill("2035-06-27");
  await replacement
    .getByRole("button", { name: "Record new version", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await workspace(page)).cases.find(
          (item) => item.id === beforeReplacement.id,
        )?.decision,
    )
    .toMatchObject({ reference: "DEMO-RESULT-1026", needsRevalidation: true });
  await page.goto(`/cases/${beforeReplacement.id}`);
  await expect(
    page.getByRole("button", {
      name: "Review route for new passport",
      exact: true,
    }),
  ).toBeVisible();
  await expect(requirement(page, "Before-departure checks")).not.toContainText(
    "Completed",
  );
  await requirement(page, "Passport photo page")
    .getByRole("button", { name: "Review", exact: true })
    .click();
  const passportReview = page.getByRole("dialog");
  await passportReview
    .getByLabel("I checked the current version", { exact: false })
    .check();
  await passportReview
    .getByRole("button", { name: "Accept document check", exact: true })
    .click();
  await expect(requirement(page, "Passport photo page")).toContainText(
    "Completed",
  );
  expect((await currentCase(page)).decision).toMatchObject({
    reference: "DEMO-RESULT-1026",
    needsRevalidation: true,
  });
  expect((await currentCase(page)).draft).toMatchObject({ needsReview: true });
  await expect(
    requirement(page, "Authority decision and validity record"),
  ).not.toContainText("Completed");
  await requirement(page, "Authority decision and validity record")
    .getByRole("button", { name: "Review decision", exact: true })
    .click();
  const revalidation = page.getByRole("dialog");
  await expect(revalidation).toContainText(
    "The previous authority result needs revalidation",
  );
  await revalidation
    .getByLabel("Current passport / authority linkage check")
    .fill(
      "Checked the replacement passport identity. The earlier passport-linked reference has not been reissued.",
    );
  await revalidation
    .getByLabel(
      "I verified the authority result against the current reviewed traveling passport version.",
    )
    .check();
  await revalidation
    .getByLabel("I understand this records only a simulated result.")
    .check();
  await revalidation
    .getByRole("button", { name: "Save decision record", exact: true })
    .click();
  await expect(revalidation).toContainText(
    "A replacement passport requires a new authority reference",
  );
  expect((await currentCase(page)).decision).toMatchObject({
    reference: "DEMO-RESULT-1026",
    needsRevalidation: true,
  });
});

test("UK intake preserves the traveling passport and routes uncertain activities or exemptions to review", async ({
  page,
}) => {
  async function ukTrip() {
    await usePreset(page);
    await page.getByLabel("Destination country").selectOption("United Kingdom");
    await page
      .getByLabel("Host organization or contact")
      .fill("Northstar London");
    await page
      .getByLabel("Employee nationality", { exact: true })
      .fill("Singapore");
    await page
      .getByLabel("Nationality of traveling passport")
      .fill("Singapore");
    await page
      .getByLabel("Existing UK permission or exemption?")
      .selectOption("none");
  }
  await ukTrip();
  await page
    .getByLabel("Official eligibility check indicates")
    .selectOption("eta");
  await page
    .getByLabel("I checked the traveling passport, nationality", {
      exact: false,
    })
    .check();
  const eta = await createFromReview(page);
  expect(eta.route).toBe("uk-eta");
  expect(eta.intake?.passportNationality).toBe("Singapore");
  await requirement(page, "TripWire application preparation draft")
    .getByRole("button", { name: "Prepare draft", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByLabel(/^Passport nationality/),
  ).toHaveValue("Singapore");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close dialog", exact: true })
    .click();

  await ukTrip();
  await page
    .getByLabel("Official eligibility check indicates")
    .selectOption("exempt");
  await page
    .getByLabel("I checked the traveling passport, nationality", {
      exact: false,
    })
    .check();
  const exempt = await createFromReview(page);
  expect(exempt.route).toBe("review");
  expect(exempt.reviewQuestion).toContain("exemption");
  expect(
    exempt.requirements.some((item) => /ETA|Visa-centre/.test(item.name)),
  ).toBe(false);

  await ukTrip();
  await page
    .getByLabel("Activity details (optional)")
    .fill(
      "Install machinery and perform hands-on technical work at the host site.",
    );
  const uncertain = await createFromReview(page);
  expect(uncertain.route).toBe("review");
  expect(uncertain.routeConfirmed).toBe(false);
  expect(uncertain.reviewQuestion).toContain("Install machinery");
  const assignedReview = (await workspace(page)).threads.find(
    (thread) =>
      thread.caseId === uncertain.id && thread.audience === "internal",
  );
  expect(assignedReview?.assignee).toBe("Unassigned");
  expect(assignedReview?.messages[0].body).toBe(uncertain.reviewQuestion);
});
