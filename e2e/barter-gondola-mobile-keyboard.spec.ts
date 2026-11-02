import { test, expect, type Page } from "@playwright/test";

/**
 * The gondola on a phone browser: the software keyboard used to cover both the
 * search field and every result under it, because the layout viewport stays at
 * full height when the browser shrinks only the visual one.
 *
 * This is fixed inside the app, not in the document shell: `web.output: "single"`
 * makes the Expo CLI serve its own SPA template, so `src/app/+html.tsx` never
 * reaches the browser and no viewport hint is available.
 *
 * Playwright cannot raise an OS keyboard, so the visual viewport is stubbed:
 * `height` is what the browser reports while the keyboard is open, and the app is
 * expected to reserve that difference at the bottom of the list.
 */
const PHONE = { width: 360, height: 740 };
const KEYBOARD_HEIGHT = 280;

async function stubVisualViewport(
  page: Page,
  keyboardOpen: boolean,
  { scale = 1 }: { scale?: number } = {},
) {
  await page.addInitScript(
    ({ viewportHeight, keyboardHeight, open, zoom }) => {
      const visualHeight = open
        ? viewportHeight - keyboardHeight
        : viewportHeight;
      const listeners = new Set<() => void>();
      const visualViewport = {
        get height() {
          return visualHeight;
        },
        width: window.innerWidth,
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
    },
    {
      viewportHeight: PHONE.height,
      keyboardHeight: KEYBOARD_HEIGHT,
      open: keyboardOpen,
      zoom: scale,
    },
  );
}

async function openGondola(page: Page) {
  await page.setViewportSize(PHONE);
  await page.goto("/barter?producerId=sabado");
  await expect(page.getByTestId("active-producer-name")).toHaveText(
    "Vermut Sabado",
    { timeout: 30000 },
  );
}

test("with the keyboard open the list reserves the space it covers", async ({
  page,
}) => {
  test.setTimeout(120000);
  await stubVisualViewport(page, true);
  await openGondola(page);

  const listContentPaddingBottom = await page
    .getByTestId("gondola-list")
    .evaluate(
      (el) =>
        getComputedStyle(el.firstElementChild as HTMLElement).paddingBottom,
    );

  expect(listContentPaddingBottom).toBe(`${KEYBOARD_HEIGHT}px`);
});

test("with no keyboard over the viewport nothing is reserved", async ({
  page,
}) => {
  test.setTimeout(120000);
  await stubVisualViewport(page, false);
  await openGondola(page);

  const listContentPaddingBottom = await page
    .getByTestId("gondola-list")
    .evaluate(
      (el) =>
        getComputedStyle(el.firstElementChild as HTMLElement).paddingBottom,
    );

  expect(listContentPaddingBottom).toBe("0px");
});

test("focusing the search field steps the producer card and the inbox aside", async ({
  page,
}) => {
  test.setTimeout(120000);
  await stubVisualViewport(page, true);
  await openGondola(page);

  const searchInput = page.getByTestId("gondola-search-input");
  await searchInput.click();

  await expect(page.getByTestId("active-producer-name")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Bandeja de Trueques/ }),
  ).toHaveCount(0);
  // The field itself and the filters stay: they are how the search is refined.
  await expect(searchInput).toBeVisible();
  await expect(page.getByTestId("gondola-filter-row")).toBeVisible();

  await page.getByTestId("gondola-list").click({ position: { x: 4, y: 4 } });
  await expect(page.getByTestId("active-producer-name")).toHaveText(
    "Vermut Sabado",
  );
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

  const listContentPaddingBottom = await page
    .getByTestId("gondola-list")
    .evaluate(
      (el) =>
        getComputedStyle(el.firstElementChild as HTMLElement).paddingBottom,
    );

  expect(listContentPaddingBottom).toBe("0px");
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
