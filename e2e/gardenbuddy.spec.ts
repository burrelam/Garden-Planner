import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Passphrase").fill("gardenbuddy");
  await page.getByRole("button", { name: "Open the garden" }).click();
  await expect(
    page.getByRole("heading", { name: "Garden planner" }),
  ).toBeVisible();
});

test("planner calendar and navigation work at this viewport", async ({
  page,
}) => {
  await expect(page.getByLabel("Annual planting calendar")).toBeVisible();
  await page.getByRole("link", { name: "Plants", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Plant Library" }),
  ).toBeVisible();
  const tomatoCard = page
    .getByRole("link")
    .filter({
      has: page.getByRole("heading", { name: "Tomato", exact: true }),
    });
  await tomatoCard.click();
  await expect(page.getByRole("heading", { name: "Tomato" })).toBeVisible();
  await expect(
    page.getByText(/Hardiness is deliberately|never from the hardiness zone/i),
  ).toBeVisible();
});

test("touch-sized add sheet can add a plant", async ({ page }) => {
  await page.getByRole("button", { name: "+ Plant" }).click();
  const dialog = page.getByRole("dialog", { name: "Add a plant" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("combobox", { name: "Plant" }).selectOption("pepper");
  await dialog.getByRole("spinbutton", { name: "Quantity" }).fill("3");
  await dialog.getByRole("button", { name: "Add to planner" }).click();
  await expect(
    page.getByRole("link", { name: "Pepper", exact: true }).first(),
  ).toBeVisible();
});
