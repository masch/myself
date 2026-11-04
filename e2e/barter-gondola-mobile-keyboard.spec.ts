import { test, expect, type Page } from "@playwright/test";

/**
 * The gondola on a phone browser.
 *
 * Two defects live here, and both are react-native-web behaviors rather than
 * styling bugs:
 *
 * 1. The keyboard shrinks only the *visual* viewport, so a `height: 100%` list
 *    keeps its full-screen layout and paints the focused field behind the
 *    keyboard. Reserving the difference as bottom padding makes the field
 *    reachable; only a scroll makes it visible. The field therefore docks at the
 *    top of the band the keyboard leaves (`spacing.md` below the list top), so
 *    the text being typed and the results under it share the screen.
 *
 * 2. `keyboardDismissMode="on-drag"` is implemented by react-native-web as
 *    `dismissKeyboard()` on **every** `scroll` event, not only a finger drag: any
 *    scroll while somebody types blurs the field, and Android hides the keyboard
 *    with the focus. A browser-driven scroll is exactly what happens on the first
 *    typed character, which is why the keyboard used to close by itself.
 *
 * Playwright cannot raise an OS keyboard, so the visual viewport is stubbed:
 * `height` is what the browser reports while the keyboard is open. The stub is
 * also the only way to open the keyboard *after* the field already has the focus,
 * which is the order a real phone follows and the one that exposed defect 2.
 */
const PHONE = { width: 360, height: 740 };
const KEYBOARD_HEIGHT = 280;
/** Bottom of what a user can still see while the keyboard is up. */
const VISIBLE_BOTTOM = PHONE.height - KEYBOARD_HEIGHT;
/** Where the field is docked: `spacing.md` below the top of the list. */
const DOCK_LINE = 16;

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
    return { top: rect.top, bottom: rect.bottom };
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

/** Where the field sits inside the list, which is the space the dock targets. */
async function fieldOffsetInList(page: Page): Promise<number> {
  const list = await boxOf(page, "gondola-list");
  const field = await boxOf(page, "gondola-search-input");

  return field.top - list.top;
}

/** Waits for the field to reach the top of the band the keyboard leaves. */
async function expectDockedField(page: Page) {
  await expect
    .poll(() => fieldOffsetInList(page), { timeout: 15000 })
    .toBeLessThanOrEqual(DOCK_LINE + 1);

  expect(await fieldOffsetInList(page)).toBeGreaterThanOrEqual(DOCK_LINE - 1);
  expect((await boxOf(page, "gondola-search-input")).bottom).toBeLessThan(
    VISIBLE_BOTTOM,
  );
}

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

test("opening the keyboard docks the search field above it", async ({
  page,
}) => {
  test.setTimeout(120000);
  await stubVisualViewport(page, false);
  await openGondola(page);

  // The premise of the defect: with no keyboard the field sits below the line
  // the keyboard will cover, so the browser has no reason to move it.
  const before = await boxOf(page, "gondola-search-input");
  expect(before.top).toBeGreaterThan(VISIBLE_BOTTOM);

  await page.getByTestId("gondola-search-input").click();
  await raiseKeyboard(page);

  await expectDockedField(page);
  expect(await listScrollTop(page)).toBeGreaterThan(0);
});

test("a scroll of the list does not take the focus out of the field", async ({
  page,
}) => {
  test.setTimeout(120000);
  await stubVisualViewport(page, false);
  await openGondola(page);

  const searchInput = page.getByTestId("gondola-search-input");
  await searchInput.click();
  await raiseKeyboard(page);

  // What the browser itself does while a caret is edited, and what a finger drag
  // does: a scroll of the list. `keyboardDismissMode="on-drag"` blurred the field
  // here, and the OS closed the keyboard with it.
  await page
    .getByTestId("gondola-list")
    .evaluate((el) => el.scrollBy({ top: 120 }));

  await page.keyboard.type("q");
  await expect(searchInput).toHaveValue("q");
});

test("typing keeps the field docked and leaves the producer card reachable above it", async ({
  page,
}) => {
  test.setTimeout(120000);
  await stubVisualViewport(page, false);
  await openGondola(page);

  const searchInput = page.getByTestId("gondola-search-input");
  await searchInput.click();
  await raiseKeyboard(page);
  await expectDockedField(page);

  await searchInput.fill("queso");

  // Nothing restructures under the caret: the field stays on the dock line, so
  // the first character cannot pull the keyboard out from under the user.
  await expectDockedField(page);
  await expect(
    page.getByText(/^Góndola de Productores \(\d+\)$/),
  ).toBeInViewport();

  // The producer card and the inbox are no longer unmounted by a search: they
  // stay above, where scrolling back reaches them.
  await expect(page.getByTestId("active-producer-name")).toHaveCount(1);
  await expect(page.getByTestId("active-producer-name")).not.toBeInViewport();

  // The ✕ keeps working, and clearing it does not move the field.
  await page.getByTestId("gondola-search-clear").click();
  await expect(searchInput).toHaveValue("");
  await expectDockedField(page);
});

test("typing filters the gondola inline and shows the count under the field", async ({
  page,
}) => {
  test.setTimeout(120000);
  await stubVisualViewport(page, true);
  await openGondola(page);

  const total = await page
    .getByText(/^Góndola de Productores \(\d+\)$/)
    .innerText();

  await page.getByTestId("gondola-search-input").fill("queso");

  await expect(
    page.getByText(/^Góndola de Productores \(\d+\)$/),
  ).not.toHaveText(total);
  await expect(page.getByText(/Góndola de Productores \(\d+\)/)).toBeVisible();
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
