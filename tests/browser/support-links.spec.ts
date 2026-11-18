import { expect, test } from "@playwright/test";

const internalNote =
  "The six-month placement includes hands-on line commissioning.";

test("internal conversation links select the requested audience and survive thread navigation", async ({
  page,
}) => {
  await page.goto("/inbox?thread=thread-internal-casey&audience=internal");

  await expect(page.getByRole("tab", { name: /^Internal/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator(".thread-detail h2")).toHaveText(
    "Casey placement: work-route assessment",
  );
  await expect(page.locator(".messages")).toContainText(internalNote);
  await expect(
    page.getByRole("textbox", { name: "Internal note", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Employee reply", exact: true }),
  ).toHaveCount(0);

  await page
    .locator(".thread-item")
    .filter({
      has: page.getByRole("heading", {
        name: "Confirm DN2 activity basis with host",
        exact: true,
      }),
    })
    .click();
  await expect(page).toHaveURL(/thread=thread-internal-dn2/);
  expect(new URL(page.url()).searchParams.get("audience")).toBe("internal");
  await page.reload();
  await expect(page.getByRole("tab", { name: /^Internal/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator(".thread-detail h2")).toHaveText(
    "Confirm DN2 activity basis with host",
  );
});

test("audience switches clear the previous selection and draft before showing employee replies", async ({
  page,
}) => {
  await page.goto("/inbox?thread=thread-internal-casey&audience=internal");
  await page
    .getByRole("textbox", { name: "Internal note", exact: true })
    .fill("Private unfinished internal assessment.");
  await page.getByRole("tab", { name: /^Employees/ }).click();

  await expect(page.getByRole("tab", { name: /^Employees/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.getByRole("textbox", { name: "Employee reply", exact: true }),
  ).toHaveValue("");
  await expect(page.locator(".messages")).not.toContainText(internalNote);
  await expect(page.locator(".thread-detail h2")).not.toHaveText(
    "Casey placement: work-route assessment",
  );
  expect(new URL(page.url()).searchParams.get("thread")).not.toBe(
    "thread-internal-casey",
  );
  expect(new URL(page.url()).searchParams.get("audience")).toBe("employee");

  await page
    .getByRole("textbox", { name: "Employee reply", exact: true })
    .fill("An unfinished employee reply.");
  await page.getByRole("tab", { name: /^Internal/ }).click();
  expect(new URL(page.url()).searchParams.get("audience")).toBe("internal");
  await expect(
    page.getByRole("textbox", { name: "Internal note", exact: true }),
  ).toHaveValue("");
  await expect(page.locator(".messages")).toContainText(internalNote);
  await page.reload();
  await expect(page.getByRole("tab", { name: /^Internal/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.getByRole("textbox", { name: "Internal note", exact: true }),
  ).toHaveValue("");

  await page.goBack();
  await expect(page.getByRole("tab", { name: /^Employees/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator(".messages")).not.toContainText(internalNote);
});
