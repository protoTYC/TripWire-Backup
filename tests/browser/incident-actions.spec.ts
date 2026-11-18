import { test, expect } from "@playwright/test";
import type { AppState } from "../../src/domain/types";
const read = (page: import("@playwright/test").Page): Promise<AppState> =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("tripwire.workspace.v3")!),
  );
test("employee escalation preserves the conversation, response actions and audiences", async ({
  page,
}) => {
  await page.goto("/inbox?thread=thread-passport");
  await page
    .getByRole("button", { name: "Escalate to Urgent", exact: true })
    .click();
  const modal = page.getByRole("dialog");
  await modal
    .getByLabel("Reason for urgency", { exact: true })
    .fill(
      "Employee has reported an airport document check and needs the recorded passport details.",
    );
  await modal.getByLabel("Location", { exact: true }).fill("SFO Terminal G");
  await modal
    .getByLabel("Time zone", { exact: true })
    .fill("America/Los_Angeles");
  await modal
    .getByRole("button", { name: "Create urgent incident", exact: true })
    .click();
  await expect.poll(async () => (await read(page)).incidents.length).toBe(3);
  const incident = (await read(page)).incidents.find(
    (i) => i.threadId === "thread-passport",
  )!;
  expect(incident.caseId).toBe("case-vn-meetings");
  await page.goto("/urgent?incident=" + incident.id);
  const drawer = page.getByRole("dialog");
  await drawer
    .getByRole("combobox", { name: "Assigned responder", exact: true })
    .selectOption("");
  await drawer
    .getByRole("combobox", { name: "Assigned responder", exact: true })
    .selectOption("Jeffrey Tang");
  await drawer
    .getByRole("button", { name: "Acknowledge", exact: true })
    .click();
  expect(
    (await read(page)).incidents.filter((i) => i.status !== "resolved"),
  ).toHaveLength(3);
  await drawer
    .getByRole("button", { name: "Ask for information", exact: true })
    .click();
  await drawer
    .getByRole("textbox", { name: /Employee message/ })
    .fill(
      "Please confirm the passport photo-page details shown on your traveling passport.",
    );
  await drawer
    .getByRole("button", { name: "Record information request", exact: true })
    .click();
  await drawer
    .getByRole("button", { name: "Link document", exact: true })
    .click();
  await drawer
    .getByRole("combobox", { name: "Employee document", exact: true })
    .selectOption("document-1");
  await drawer
    .getByRole("button", { name: "Link document", exact: true })
    .last()
    .click();
  await drawer
    .getByRole("button", { name: "Escalate internally", exact: true })
    .click();
  await drawer
    .getByRole("textbox", { name: /Internal note/ })
    .fill(
      "Internal coordination: verify route eligibility with host; do not send this note to employee.",
    );
  await drawer
    .getByRole("button", { name: "Save internal escalation", exact: true })
    .click();
  const current = (await read(page)).incidents.find(
    (i) => i.id === incident.id,
  )!;
  expect(current.assignee).toBe("Jeffrey Tang");
  expect(current.documentIds).toContain("document-1");
  await page.goto("/inbox?thread=thread-passport");
  await expect(page.locator(".messages")).toContainText(
    "Please confirm the passport photo-page details",
  );
  await expect(page.locator(".messages")).not.toContainText(
    "Internal coordination:",
  );
  await page.getByRole("tab", { name: /^Internal/ }).click();
  await page
    .locator(".thread-item")
    .filter({ hasText: "Internal coordination:" })
    .click();
  await expect(page.locator(".messages")).toContainText(
    "Internal coordination:",
  );
});
