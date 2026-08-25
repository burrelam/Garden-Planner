import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Passphrase").fill("gardenbuddy");
  await page.getByRole("button", { name: "Open the garden" }).click();
  await expect(
    page.getByRole("heading", { name: "My Garden Planting Calendar" }),
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
  const tomatoCard = page.getByRole("link").filter({
    has: page.getByRole("heading", { name: "Tomato", exact: true }),
  });
  await tomatoCard.click();
  await expect(page.getByRole("heading", { name: "Tomato" })).toBeVisible();
  await expect(
    page.getByText(/Hardiness is deliberately|never from the hardiness zone/i),
  ).toBeVisible();
});

test("touch-sized add sheet can add a plant", async ({ page }) => {
  const pepperLinks = page.getByRole("link", { name: "Pepper", exact: true });
  const originalPepperCount = await pepperLinks.count();
  await page.getByRole("button", { name: "+ Plant" }).click();
  const dialog = page.getByRole("dialog", { name: "Add a plant" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("combobox", { name: "Plant" }).selectOption("pepper");
  await dialog.getByRole("spinbutton", { name: "Quantity" }).fill("3");
  await dialog.getByRole("button", { name: "Add to planner" }).click();
  await expect(pepperLinks).toHaveCount(originalPepperCount + 1);
});

test("dialogs keep keyboard focus contained and return it on close", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");

  const trigger = page.getByRole("button", { name: "+ Bed" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Add a garden bed" });
  const close = dialog.getByRole("button", { name: "Close" });
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Add bed" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("iPhone plant editing uses a visible, scrollable detail sheet", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "iphone-webkit");

  // The desktop editor used to be squeezed into the pinned plant column. On an
  // iPhone that clipped the bed field and Remove button completely. A compact
  // row plus a bottom sheet matches Amanda's original interaction and gives
  // every field the full phone width.
  await page.getByRole("button", { name: "Edit Tomato — Roma" }).click();
  const sheet = page.getByRole("dialog", { name: "Tomato details" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByLabel("Quantity")).toBeVisible();
  await expect(sheet.getByLabel("Status")).toBeVisible();
  await expect(sheet.getByLabel("Bed")).toBeVisible();
  await expect(
    sheet.getByRole("button", { name: "Remove Tomato" }),
  ).toBeVisible();

  const layout = await sheet.evaluate((element) => {
    const sheetRect = element.getBoundingClientRect();
    const fields = Array.from(
      element.querySelectorAll<HTMLElement>("button, input, select, a"),
    );
    return {
      overflowY: getComputedStyle(element).overflowY,
      outside: fields
        .filter((field) => {
          const rect = field.getBoundingClientRect();
          return rect.left < sheetRect.left || rect.right > sheetRect.right;
        })
        .map((field) => field.getAttribute("aria-label") ?? field.textContent),
    };
  });
  expect(layout.outside).toEqual([]);
  expect(["auto", "scroll"]).toContain(layout.overflowY);
});

test("an iPhone edit survives reload and appears in another browser session", async ({
  page,
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== "iphone-webkit");

  await page.getByRole("button", { name: "Edit Tomato — Roma" }).click();
  const sheet = page.getByRole("dialog", { name: "Tomato details" });
  await sheet.getByLabel("Quantity").fill("7");
  await sheet.getByLabel("Status").selectOption("planted");
  await sheet.getByLabel("Bed").selectOption("c");
  await sheet.getByRole("button", { name: "Save plant" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");

  await page.reload();
  await page.getByRole("button", { name: "Edit Tomato — Roma" }).click();
  await expect(
    page.getByRole("dialog", { name: "Tomato details" }).getByLabel("Quantity"),
  ).toHaveValue("7");

  const secondContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  try {
    const secondPage = await secondContext.newPage();
    await secondPage.goto("http://127.0.0.1:3000/");
    await secondPage.getByLabel("Passphrase").fill("gardenbuddy");
    await secondPage.getByRole("button", { name: "Open the garden" }).click();
    await secondPage
      .getByRole("button", { name: "Edit Tomato — Roma" })
      .click();
    await expect(
      secondPage
        .getByRole("dialog", { name: "Tomato details" })
        .getByLabel("Quantity"),
    ).toHaveValue("7");
  } finally {
    await secondContext.close();
  }
});

test("the iPhone calendar scrolls while its labels and headers stay pinned", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "iphone-webkit");

  const calendar = page.getByLabel("Annual planting calendar");
  const plantLabel = calendar.getByText("Plant", { exact: true });
  const january = calendar.getByText("Jan", { exact: true });
  const rect = (locator: typeof plantLabel) =>
    locator.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return { left: bounds.left, top: bounds.top };
    });
  const before = {
    plant: await rect(plantLabel),
    month: await rect(january),
  };
  const scroll = await calendar.evaluate((element) => {
    const start = { left: element.scrollLeft, top: element.scrollTop };
    element.scrollTo({ left: element.scrollWidth, top: 260 });
    return {
      start,
      end: { left: element.scrollLeft, top: element.scrollTop },
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    };
  });
  const after = {
    plant: await rect(plantLabel),
    month: await rect(january),
  };

  expect(scroll.scrollWidth).toBeGreaterThan(scroll.clientWidth);
  expect(scroll.end.left).toBeGreaterThan(scroll.start.left);
  expect(scroll.end.top).toBeGreaterThan(scroll.start.top);
  expect(after.plant.left).toBeCloseTo(before.plant.left, 0);
  expect(after.month.top).toBeCloseTo(before.month.top, 0);
});

test("phone pages never create accidental document-wide horizontal scrolling", async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.name.includes("iphone") &&
      !testInfo.project.name.includes("android"),
  );

  for (const route of ["/planner", "/plants", "/settings", "/sources"]) {
    await page.goto(route);
    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(widths.document, route).toBeLessThanOrEqual(widths.viewport);
  }
});
