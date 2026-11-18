import { test, expect } from "@playwright/test";
import { createInitialState } from "../../src/domain/fixtures";
import { replaceDocument, linkDocument } from "../../src/domain/operations";
import type { AppState } from "../../src/domain/types";

test("a reviewed replacement cannot silently reuse a passport-linked ETA result", async ({
  page,
}) => {
  const state = createInitialState();
  const record = state.cases.find((c) => c.id === "case-uk-completed")!;
  const historicalReference = record.decision!.reference;
  replaceDocument(state, "document-13", "Ethan-new-passport.pdf", "2035-01-01");
  const passport = state.documents.find((d) => d.id === "document-13")!;
  passport.status = "reviewed";
  passport.versions.find((v) => v.id === passport.currentVersionId)!.status =
    "reviewed";
  linkDocument(
    state,
    record.id,
    record.requirements.find((r) => r.documentType === "passport")!.id,
    passport.id,
  );
  await page.goto("/");
  await page.evaluate(
    (s) => localStorage.setItem("tripwire.workspace.v3", JSON.stringify(s)),
    state,
  );
  await page.goto("/cases/case-uk-completed");
  await expect(page.locator("main")).toContainText(
    "The previous authority result needs revalidation after a passport replacement.",
  );
  const decisionRow = page
    .locator(".checklist-item")
    .filter({
      has: page.getByRole("heading", {
        name: "ETA electronic result and passport linkage",
        exact: true,
      }),
    });
  await expect(decisionRow).toContainText("Needs correction");
  await decisionRow
    .getByRole("button", { name: "Review decision", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Authority result / document reference", { exact: true })
    .fill(historicalReference);
  await dialog
    .getByLabel("Current passport / authority linkage check", { exact: true })
    .fill(
      "Checked a newly recorded demonstration ETA against the replacement traveling passport.",
    );
  await dialog
    .getByRole("checkbox", {
      name: /I verified the authority result against the current reviewed/,
    })
    .check();
  await dialog
    .getByRole("checkbox", {
      name: "I understand this records only a simulated result.",
      exact: true,
    })
    .check();
  await dialog
    .getByRole("button", { name: "Save decision record", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "new authority reference",
  );
  await dialog
    .getByLabel("Authority result / document reference", { exact: true })
    .fill("DEMO-ETA-REPLACEMENT-NEW");
  await dialog
    .getByRole("button", { name: "Save decision record", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  const saved: AppState = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tripwire.workspace.v3")!),
  );
  const updated = saved.cases.find((c) => c.id === record.id)!;
  expect(updated.decision?.needsRevalidation).toBe(false);
  expect(updated.decision?.passportVersionId).toBe(passport.currentVersionId);
  expect(updated.draft?.needsReview).toBe(true);
  expect(
    updated.requirements.find((r) => r.stage === "departure")?.status,
  ).not.toBe("completed");
  expect(
    saved.history.some((h) => h.message.includes(historicalReference)),
  ).toBe(true);
});
