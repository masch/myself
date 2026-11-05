import { test, expect, type Page } from "@playwright/test";

/**
 * The gondola's search field on a phone.
 *
 * Three promises live here, and each one failed on a phone before the pinned bar:
 *
 * 1. The field is **pinned above the list**. It used to be the first item of the
 *    list header, 1000-odd pixels down, so the software keyboard covered it both
 *    on the web (only the visual viewport shrinks) and on native (an Expo Android
 *    app is edge-to-edge, so the window does not resize either). A field that
 *    never scrolls cannot be covered by an inset it does not depend on.
 *
 * 2. The list still **reserves** the space the keyboard covers, so the last
 *    result can be scrolled clear of it.
 *
 * 3. A scroll of the results does not take the caret out of the field, and does
 *    not move the field: `keyboardDismissMode="on-drag"` used to blur it on
 *    react-native-web, where that mode is implemented as `dismissKeyboard()` on
 *    every `scroll` event.
 *
 * Playwright cannot raise an OS keyboard, so the visual viewport is stubbed:
 * `height` is what the browser reports while the keyboard is open. The stub is
 * also the only way to open the keyboard *after* the field already has the focus,
 * which is the order a real phone follows.
 */
const PHONE = { width: 360, height: 740 };
const KEYBOARD_HEIGHT = 280;
/** Bottom of what a user can still see while the keyboard is up. */
const VISIBLE_BOTTOM = PHONE.height - KEYBOARD_HEIGHT;
const COUNT = /^Góndola de Productores \(\d+\)$/;

type KeyboardWindow = Window & {
  __setKeyboardOpen: (open: boolean) => void;
};

async function stubVisualViewport(
  page: Page,
  keyboardOpen: boolean,
  { scale = 1 }: { scale?: number } = {},
) {
  await page.addInitScript(
    ({ viewportHeight, keyboardHeight, open, zoom }) => {
      const listeners = new Set<() => void>();
      const state = { open };
      const visualViewport = {
        get height() {
          return state.open ? viewportHeight - keyboardHeight : viewportHeight;
        },
        get width() {
          return window.innerWidth;
        },
        scale: zoom,
        offsetTop: 0,
        offsetLeft: 0,
        pageTop: 0,
        pageLeft: 0,
        addEventListener: (_type: string, listener: () => void) => {
          listeners.add(listener);
        },
        removeEventListener: (_type: string, listener: () => void) => {
          listeners.delete(listener);
        },
      };
      Object.defineProperty(window, "visualViewport", {
        configurable: true,
        value: visualViewport,
      });
      // Opening the OS keyboard is a visual-viewport resize; the stub reports it
      // the way the browser does, to every listener the app attached.
      (window as unknown as KeyboardWindow).__setKeyboardOpen = (
        openNext: boolean,
      ) => {
        state.open = openNext;
        for (const listener of listeners) listener();
      };
    },
    {
      viewportHeight: PHONE.height,
      keyboardHeight: KEYBOARD_HEIGHT,
      open: keyboardOpen,
      zoom: scale,
    },
  );
}

/** Opens the keyboard over a field that already has the focus, as a phone does. */
async function raiseKeyboard(page: Page) {
  await page.evaluate(() => {
    (window as unknown as KeyboardWindow).__setKeyboardOpen(true);
  });
}

async function openGondola(page: Page) {
  await page.setViewportSize(PHONE);
  await page.goto("/barter?producerId=sabado");
  await expect(page.getByTestId("active-producer-name")).toHaveText(
    "Vermut Sabado",
    { timeout: 30000 },
  );
}

async function boxOf(page: Page, testID: string) {
  return page.getByTestId(testID).evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
    };
  });
}

async function listScrollTop(page: Page) {
  return page.getByTestId("gondola-list").evaluate((el) => el.scrollTop);
}

/**
 * The content's bottom padding, in pixels.
 *
 * Asserted as a *difference* instead of an absolute: the rule is that the list
 * reserves the space the keyboard takes, not how much safe area a device has.
 */
async function listContentPaddingBottom(page: Page): Promise<number> {
  const padding = await page
    .getByTestId("gondola-list")
    .evaluate(
      (el) =>
        getComputedStyle(el.firstElementChild as HTMLElement).paddingBottom,
    );

  return Number.parseFloat(padding);
}

test("the search field sits above the list, so no keyboard inset can cover it", async ({
  page,
}) => {
  test.setTimeout(120000);
  await stubVisualViewport(page, true);
  await openGondola(page);

  const field = await boxOf(page, "gondola-search-input");
  const list = await boxOf(page, "gondola-list");

  // Pinned: the field's whole box is above the scrolling area.
  expect(field.bottom).toBeLessThanOrEqual(list.top + 1);
  // And with the keyboard open it is still on screen, at first paint, with the
  // list never scrolled.
  expect(field.bottom).toBeLessThan(VISIBLE_BOTTOM);
  expect(await listScrollTop(page)).toBe(0);
});

test("the list reserves exactly the space the keyboard covers", async ({
  page,
}) => {
  test.setTimeout(120000);
  await stubVisualViewport(page, false);
  await openGondola(page);

  const withoutKeyboard = await listContentPaddingBottom(page);
  await raiseKeyboard(page);

  await expect
    .poll(async () => (await listContentPaddingBottom(page)) - withoutKeyboard)
    .toBe(KEYBOARD_HEIGHT);
});

test("a scroll of the results neither blurs the field nor moves it", async ({
  page,
}) => {
  test.setTimeout(120000);
  await stubVisualViewport(page, false);
  await openGondola(page);

  const searchInput = page.getByTestId("gondola-search-input");
  await searchInput.click();
  await raiseKeyboard(page);

  const before = await boxOf(page, "gondola-search-input");

  // What the browser itself does while a caret is edited, and what a finger drag
  // does: a scroll of the list. `keyboardDismissMode="on-drag"` blurred the field
  // here, and the OS closed the keyboard with it.
  await page
    .getByTestId("gondola-list")
    .evaluate((el) => el.scrollBy({ top: 240 }));

  await page.keyboard.type("q");
  await expect(searchInput).toHaveValue("q");

  const after = await boxOf(page, "gondola-search-input");
  expect(after.top).toBe(before.top);
  expect(after.bottom).toBe(before.bottom);
});

test("typing filters the gondola and updates the count under the field", async ({
  page,
}) => {
  test.setTimeout(120000);
  await stubVisualViewport(page, true);
  await openGondola(page);

  const total = await page.getByText(COUNT).innerText();

  await page.getByTestId("gondola-search-input").fill("queso");

  await expect(page.getByText(COUNT)).not.toHaveText(total);
  await expect(page.getByText(COUNT)).toBeVisible();

  // The ✕ works while the field is pinned, and the field does not move.
  const before = await boxOf(page, "gondola-search-input");
  await page.getByTestId("gondola-search-clear").click();
  await expect(page.getByTestId("gondola-search-input")).toHaveValue("");
  expect((await boxOf(page, "gondola-search-input")).top).toBe(before.top);
});

test("the producer identity stays in the list, one short scroll away", async ({
  page,
}) => {
  test.setTimeout(120000);
  await stubVisualViewport(page, true);
  await openGondola(page);

  // The identity block scrolls with the results; it is not unmounted by a search.
  await expect(page.getByTestId("active-producer-name")).toBeInViewport();
  await page.getByTestId("gondola-search-input").fill("queso");
  await expect(page.getByTestId("active-producer-name")).toHaveCount(1);
});

test("every distance option is fully visible at phone width", async ({
  page,
}) => {
  test.setTimeout(120000);
  await stubVisualViewport(page, false);
  await openGondola(page);

  const row = page.getByTestId("gondola-distance-row");
  await expect(row).toBeInViewport();

  const chips = await row.getByRole("button").evaluateAll((els) =>
    els.map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        text: (el.textContent ?? "").trim(),
        left: rect.left,
        right: rect.right,
      };
    }),
  );

  expect(chips.map((chip) => chip.text)).toEqual([
    "Cualquier distancia",
    "< 50 km",
    "< 250 km",
    "< 800 km",
  ]);

  // Nothing is cut off: the last chip used to end past the right edge of a phone,
  // hidden behind a horizontal drag nothing announced.
  for (const chip of chips) {
    expect(chip.left).toBeGreaterThanOrEqual(0);
    expect(chip.right).toBeLessThanOrEqual(PHONE.width);
  }
});

test("pinch zoom reserves nothing, because nothing is covering the viewport", async ({
  page,
}) => {
  test.setTimeout(120000);
  // Zoomed to 2x on a phone: the visual viewport halves and no keyboard is open.
  await stubVisualViewport(page, true, { scale: 2 });
  await openGondola(page);

  // A zoomed viewport is not a covered one: nothing keyboard-sized is reserved.
  expect(await listContentPaddingBottom(page)).toBeLessThan(KEYBOARD_HEIGHT);
});

test("the search field keeps its focus ring only while it has focus", async ({
  page,
}) => {
  test.setTimeout(120000);
  await stubVisualViewport(page, true);
  await openGondola(page);

  const searchInput = page.getByTestId("gondola-search-input");
  const borderColor = () =>
    searchInput.evaluate((el) => getComputedStyle(el).borderTopColor);

  const unfocused = await borderColor();
  await searchInput.click();
  const focused = await borderColor();
  expect(focused).not.toBe(unfocused);

  await page.getByTestId("gondola-list").click({ position: { x: 4, y: 4 } });

  await expect.poll(borderColor).toBe(unfocused);
});
