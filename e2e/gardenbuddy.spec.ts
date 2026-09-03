import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Passphrase").fill("gardenbuddy");
  await page.getByRole("button", { name: "Open the garden" }).click();
  await expect(page.getByLabel("Annual planting calendar")).toBeVisible();
});

test("planner calendar and navigation work at this viewport", async ({
  page,
}) => {
  await expect(page.getByLabel("Annual planting calendar")).toBeVisible();
  await page.getByRole("button", { name: "Open menu" }).click();
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
  // Plant names are plain text in the row now, not links to the plant guide.
  const pepperRows = page
    .getByLabel("Annual planting calendar")
    .getByText("Pepper", { exact: true });
  const originalPepperCount = await pepperRows.count();
  await page.getByRole("button", { name: "+ Plant" }).click();
  const dialog = page.getByRole("dialog", { name: "Add a plant" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("combobox", { name: "Plant" }).selectOption("pepper");
  await dialog.getByRole("spinbutton", { name: "Quantity" }).fill("3");
  await dialog.getByRole("button", { name: "Add to planner" }).click();
  await expect(pepperRows).toHaveCount(originalPepperCount + 1);
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
  // The pinned corner holds the sort control; it is the left-most thing that
  // must not drift when the calendar scrolls sideways.
  const plantLabel = calendar.getByRole("combobox", { name: "Sort plants" });
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

test("More holds the garden's facts, and the ZIP can be changed there", async ({
  page,
}) => {
  await page.getByRole("button", { name: "More" }).click();
  const sheet = page.getByRole("dialog", { name: "More about the garden" });
  await expect(sheet).toBeVisible();

  // Everything that used to sit above the calendar now lives in here.
  await expect(sheet.getByText("Last frost")).toBeVisible();
  await expect(sheet.getByText("First frost")).toBeVisible();
  await expect(sheet.getByText(/^\d+ days$/)).toBeVisible();
  await expect(sheet.getByText("Start seeds indoors")).toBeVisible();
  await expect(
    sheet.getByRole("link", { name: /All garden settings/ }),
  ).toBeVisible();

  // A zone typed by hand wins, and clears the ZIP it no longer matches.
  await sheet.getByRole("button", { name: "Change hardiness zone" }).click();
  const zone = sheet.getByLabel("Hardiness zone", { exact: true });
  // Every project shares one database, so pick a zone that is genuinely a
  // change whatever an earlier run left behind.
  const next = (await zone.inputValue()) === "9a" ? "8b" : "9a";
  await zone.fill(next);
  await zone.press("Enter");
  await expect(
    sheet.getByText(new RegExp(`zone ${next}, ZIP cleared`)),
  ).toBeVisible();

  // Settings is the same record, so it shows the same zone.
  await sheet.getByRole("link", { name: /All garden settings/ }).click();
  await expect(page.getByLabel("Hardiness zone", { exact: true })).toHaveValue(
    next,
  );
  await expect(page.getByLabel("ZIP code", { exact: true })).toHaveValue("");
});

test("the floating planner controls fit without clipping", async ({ page }) => {
  // Three controls share a phone's width. They are set not to wrap, so the way
  // this fails now is the label overflowing its button and being cut off —
  // invisible in a screenshot at a glance, so measure it.
  const controls = await page.evaluate(() =>
    [...document.querySelectorAll('[class*="plannerDock"] button')].map(
      (button) => ({
        text: button.textContent?.trim() ?? "",
        clipped: button.scrollWidth > button.clientWidth + 1,
        height: Math.round(button.getBoundingClientRect().height),
      }),
    ),
  );
  expect(controls).toHaveLength(3);
  for (const control of controls) {
    expect(control, `"${control.text}" should not be clipped`).toHaveProperty(
      "clipped",
      false,
    );
    // A wrapped label would push the button taller than a single row.
    expect(control.height, `"${control.text}" should be one row`).toBeLessThan(
      56,
    );
  }
});

// --- Regressions Amanda reported on her phone -------------------------------

test("a bed's settings panel cannot outlive the bed", async ({ page }) => {
  // The panel used to hold a copy of the bed rather than its id, so once the
  // bed was gone the panel stayed up over nothing and Remove did nothing at
  // all. Here the delete lands on the server but the client is told it
  // conflicted — the shape of a tap that fires twice on a phone.
  await page.getByRole("button", { name: "+ Bed" }).click();
  const add = page.getByRole("dialog", { name: "Add a garden bed" });
  await add.getByLabel("Name").fill("Doomed bed");
  await add.getByRole("button", { name: "Add bed" }).click();
  await expect(add).toBeHidden();

  let armed = true;
  await page.route("**/api/garden", async (route) => {
    if (route.request().method() === "PUT" && armed) {
      armed = false;
      const response = await route.fetch();
      return route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          error: "conflict",
          current: await response.json(),
        }),
      });
    }
    return route.continue();
  });

  await page
    .getByRole("button", { name: "Bed settings for Doomed bed" })
    .click();
  const panel = page.getByRole("dialog", { name: /^Bed settings/ });
  await panel.getByRole("button", { name: "Remove bed" }).click();
  await panel.getByRole("button", { name: "Remove bed" }).click();

  // The bed is gone from the garden, so its panel must be gone too.
  await expect(
    page.getByRole("button", { name: "Bed settings for Doomed bed" }),
  ).toHaveCount(0);
  await expect(panel).toBeHidden();
});

test("opening a second bed shows that bed, not the last one", async ({
  page,
}) => {
  // Two beds the seeded garden already has, so this test adds nothing that a
  // later test would then find twice.
  await page.getByRole("button", { name: "Bed settings for Bed A" }).click();
  const first = page.getByRole("dialog", { name: "Bed settings — Bed A" });
  await first.getByRole("button", { name: "Remove bed" }).click();
  // Armed, but abandoned rather than confirmed.
  await expect(first.getByRole("button", { name: "Keep bed" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(first).toBeHidden();

  // The next bed opens as itself: its own name, and Remove not already armed.
  await page.getByRole("button", { name: "Bed settings for Bed B" }).click();
  const second = page.getByRole("dialog", { name: "Bed settings — Bed B" });
  await expect(second).toBeVisible();
  await expect(second.getByRole("button", { name: "Keep bed" })).toHaveCount(0);
  await expect(second.getByLabel("Name")).toHaveValue("Bed B");
});

test("Saved says so, then goes away without moving the calendar", async ({
  page,
}, testInfo) => {
  const calendar = page.getByLabel("Annual planting calendar");
  // Document-relative, so this measures the grid being pushed down rather than
  // the page happening to be scrolled somewhere else.
  const top = () => calendar.evaluate((el: HTMLElement) => el.offsetTop);
  const before = await top();

  await page.getByRole("button", { name: "+ Bed" }).click();
  const add = page.getByRole("dialog", { name: "Add a garden bed" });
  await add.getByLabel("Name").fill(`Toast bed ${testInfo.project.name}`);
  await add.getByRole("button", { name: "Add bed" }).click();

  const toast = page.getByRole("status").filter({ hasText: "Saved" });
  await expect(toast).toBeVisible();

  // It floats above the grid rather than taking a row of its own.
  expect(await toast.evaluate((el) => getComputedStyle(el).position)).toBe(
    "fixed",
  );
  expect(await top()).toBe(before);

  // And it leaves on its own.
  await expect(toast).toBeHidden({ timeout: 6000 });
  expect(await top()).toBe(before);
});

test("a save that fails keeps its message until it is dismissed", async ({
  page,
}) => {
  await page.route("**/api/garden", async (route) =>
    route.request().method() === "PUT"
      ? route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "The garden could not be saved" }),
        })
      : route.continue(),
  );

  await page.getByRole("button", { name: "+ Bed" }).click();
  const add = page.getByRole("dialog", { name: "Add a garden bed" });
  await add.getByLabel("Name").fill("Never saved");
  await add.getByRole("button", { name: "Add bed" }).click();

  const toast = page.getByRole("status");
  await expect(toast).toContainText("could not be saved");
  // Well past the window "Saved" would have used.
  await page.waitForTimeout(3500);
  await expect(toast).toBeVisible();
  await toast.getByRole("button", { name: "Dismiss message" }).click();
  await expect(toast).toBeHidden();
});

test("the growing season block leaves room for the legend", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "iphone-webkit");

  // Three tall bars used to take most of the panel and push the legend off the
  // bottom of the phone. What matters is that the legend is reachable without
  // scrolling past the frost dates; the height bound is what makes that hold.
  await page.getByRole("button", { name: /^More/ }).click();
  const panel = page.getByRole("dialog", { name: "More about the garden" });
  await expect(panel).toBeVisible();

  const measured = await panel
    .locator("p", { hasText: "Last frost" })
    .first()
    .evaluate((el) => {
      const row = el.parentElement as HTMLElement;
      const legend = [...document.querySelectorAll("h3")]
        .find((h) => h.textContent?.includes("legend"))
        ?.nextElementSibling?.getBoundingClientRect();
      return {
        seasonHeight: row.getBoundingClientRect().height,
        legendBottom: legend?.bottom ?? Infinity,
        viewportHeight: window.innerHeight,
      };
    });

  expect(measured.seasonHeight).toBeLessThan(130);
  // The whole legend, not just its first row, sits on the phone screen.
  expect(measured.legendBottom).toBeLessThanOrEqual(measured.viewportHeight);
  await expect(panel.getByText("Start seeds indoors")).toBeVisible();
});
