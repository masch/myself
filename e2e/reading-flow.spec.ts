import { test, expect, type Page } from "@playwright/test";
import { signInAsAdmin } from "./helpers/session";

/**
 * Curated-content writes are admin-only since T3 (`requireRole("admin")`, S6), so every
 * test here that writes drives the real sign-in form first. The credential comes from
 * `./helpers/session`, which reads the value `playwright.config.ts` normalized for this
 * run — the same one that seeds the admin identity the API serves.
 *
 * This spec deliberately does not use `./fixtures`: one of its tests proves what the gate
 * does to a browser with no session, which an auto-sign-in fixture would hide.
 */

/**
 * Opens the readings screen by clicking the tab, never by a fresh `page.goto` for a
 * write the same test just made: the cookie survives a reload now (T5), but the in-test
 * sequence is about the app, not about the browser.
 */
async function openReadingsTab(page: Page) {
  // The web tab bar labels this tab with the screen title, not the native tab label.
  await page.getByRole("tab", { name: "Meditation Readings" }).click();

  await expect(
    page.getByRole("tabpanel", { name: "Meditation Readings" }),
  ).toBeVisible({ timeout: 15000 });
}

test.describe("E2E Browser Meditation Reading Flow", () => {
  test("sends an unauthenticated browser to the sign-in gate", async ({
    page,
  }) => {
    await page.goto("/readings");

    // The authenticated tree is not registered while there is no session (S13), so the
    // URL the browser asked for resolves to the sign-in form instead.
    await expect(page.getByLabel("Email address")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add new reading" }),
    ).toHaveCount(0);
  });

  test("keeps the session in the browser's cookie jar, so a page load stays signed in", async ({
    page,
  }) => {
    await signInAsAdmin(page);

    // T5's allowlist with credentials is what makes this possible: before it, the
    // client had to ask for `same-origin` and the browser stored no cookie at all.
    const cookies = await page.context().cookies();
    expect(cookies.length).toBeGreaterThan(0);

    await page.goto("/readings");

    // A full page load: the in-memory token is gone, so the session can only come from
    // the cookie the browser now sends.
    await expect(
      page.getByRole("tabpanel", { name: "Meditation Readings" }),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel("Email address")).toHaveCount(0);
  });

  test("creates a new meditation reading via browser UI and persists to backend DB", async ({
    page,
    request,
  }) => {
    page.on("console", (msg) =>
      console.log(`[Browser Console ${msg.type()}]:`, msg.text()),
    );
    page.on("pageerror", (err) =>
      console.log(`[Browser PageError]:`, err.message),
    );

    // 1. Verify API backend is running and healthy
    const health = await request.get("http://localhost:8788/health");
    expect(health.ok()).toBe(true);

    // 2. Sign in as the seeded admin, then open the readings screen in-app
    await signInAsAdmin(page);
    await openReadingsTab(page);

    // 3. Open New Reading Modal via accessible header button or hero card button
    const addReadingBtn = page
      .getByRole("button", { name: /Add new reading/i })
      .or(page.getByLabel(/Add new reading/i))
      .or(page.locator('button, [role="button"]').filter({ hasText: /\+/ }))
      .first();
    await expect(addReadingBtn).toBeVisible({ timeout: 5000 });
    await addReadingBtn.click();

    // 4. Create new author via UI ABM
    const newAuthorBtn = page.getByRole("button", { name: "+ New author" });
    await expect(newAuthorBtn).toBeVisible({ timeout: 5000 });
    await newAuthorBtn.click();

    const authorInput = page.getByPlaceholder(/Author name/i);
    await expect(authorInput).toBeVisible({ timeout: 5000 });
    const nonce = crypto.randomUUID().slice(0, 8);
    const testAuthor = `Author ${nonce}`;
    await authorInput.fill(testAuthor);

    // 5. Fill in the reading form
    const testTitle = `E2E Browser Test ${nonce}`;
    const testContent = "Vivir con tranquilidad y foco en el presente.";

    // Title input
    const titleInput = page
      .locator(
        'input[placeholder*="Poder sobre la Mente"], input[placeholder*="Ej:"]',
      )
      .first();
    await titleInput.fill(testTitle);

    // Content passage input
    const contentInput = page
      .locator('textarea, input[placeholder*="escribe"]')
      .first();
    if (await contentInput.isVisible()) {
      await contentInput.fill(testContent);
    }

    // 5. Submit the form
    const saveButton = page.getByRole("button", { name: "Save" });
    await expect(saveButton).toBeVisible();
    await saveButton.click({ force: true });

    // 6. Verify directly in Backend API that reading was created & capture its unique ID
    let createdReadingId: string | null = null;
    await expect
      .poll(
        async () => {
          const res = await request.get(
            "http://localhost:8788/v1/readings?limit=50",
          );
          if (!res.ok()) return false;
          const json = await res.json();
          const items = json.items ?? json.data?.items ?? [];
          const found = items.find(
            (item: any) => item.translations?.es?.title === testTitle,
          );
          if (found) {
            createdReadingId = found.id;
            return true;
          }
          return false;
        },
        {
          intervals: [500, 1000],
          timeout: 10000,
        },
      )
      .toBe(true);

    expect(createdReadingId).toBeTruthy();

    // 7. Test UPDATE: Click Edit on the newly created reading
    const editBtn = page.getByRole("button", {
      name: `Edit reading ${testTitle}`,
    });
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();

    // 8. Update title and content
    const updatedTitle = `${testTitle} (Updated)`;
    const updatedContent = "Contenido actualizado con serenidad.";

    const editTitleInput = page
      .locator(
        'input[placeholder*="Poder sobre la Mente"], input[placeholder*="Ej:"]',
      )
      .first();
    await expect(editTitleInput).toBeVisible({ timeout: 5000 });
    await editTitleInput.fill(updatedTitle);

    const editContentInput = page
      .locator('textarea, input[placeholder*="escribe"]')
      .first();
    if (await editContentInput.isVisible()) {
      await editContentInput.fill(updatedContent);
    }

    // 9. Save the update
    const updateSaveButton = page.getByRole("button", { name: "Save" });
    await expect(updateSaveButton).toBeVisible();
    await updateSaveButton.click({ force: true });

    // 10. Verify directly in Backend API that the exact reading was updated
    await expect
      .poll(
        async () => {
          const res = await request.get(
            `http://localhost:8788/v1/readings/${createdReadingId}`,
          );
          if (!res.ok()) return false;
          const json = await res.json();
          const item = json.data ?? json;
          return item.translations?.es?.title === updatedTitle;
        },
        {
          intervals: [500, 1000],
          timeout: 10000,
        },
      )
      .toBe(true);

    // 11. Test DELETE: Click Delete button and accept confirmation dialog
    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });

    const deleteBtn = page.getByRole("button", {
      name: `Delete reading ${updatedTitle}`,
    });
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });
    await deleteBtn.click();

    // 12. Verify directly in Backend API that the specific reading ID was deleted
    await expect
      .poll(
        async () => {
          const res = await request.get(
            `http://localhost:8788/v1/readings/${createdReadingId}`,
          );
          return res.status() === 404;
        },
        {
          intervals: [500, 1000],
          timeout: 10000,
        },
      )
      .toBe(true);
  });

  test("creates reading while offline, stores locally, and syncs to backend once back online", async ({
    page,
    request,
  }) => {
    // 1. Sign in as the seeded admin, then open the readings screen in-app. The outbox
    //    push this test drains sends the same bearer as any other curated write.
    await signInAsAdmin(page);
    await openReadingsTab(page);

    // 2. Open New Reading Modal via accessible header button or hero card button
    const addReadingBtn = page
      .getByRole("button", { name: /Add new reading/i })
      .or(page.getByLabel(/Add new reading/i))
      .or(page.locator('button, [role="button"]').filter({ hasText: /\+/ }))
      .first();
    await expect(addReadingBtn).toBeVisible({ timeout: 5000 });
    await addReadingBtn.click();

    // 3. Create new author
    const newAuthorBtn = page.getByRole("button", { name: "+ New author" });
    await expect(newAuthorBtn).toBeVisible({ timeout: 5000 });
    await newAuthorBtn.click();

    const authorInput = page.getByPlaceholder(/Author name/i);
    await expect(authorInput).toBeVisible({ timeout: 5000 });
    const offlineNonce = crypto.randomUUID().slice(0, 8);
    const testAuthor = `Offline Author ${offlineNonce}`;
    await authorInput.fill(testAuthor);

    // 4. Simulate Backend network failure (Go Offline)
    await page.route("**/v1/**", (route) => route.abort("failed"));

    const testTitle = `Offline Reading ${offlineNonce}`;
    const testContent = "Escrita localmente sin conexión de red.";

    const titleInput = page
      .locator(
        'input[placeholder*="Poder sobre la Mente"], input[placeholder*="Ej:"]',
      )
      .first();
    await titleInput.fill(testTitle);

    const contentInput = page
      .locator('textarea, input[placeholder*="escribe"]')
      .first();
    if (await contentInput.isVisible()) {
      await contentInput.fill(testContent);
    }

    // 5. Submit while offline - must succeed locally in SQLite
    const saveButton = page.getByRole("button", { name: "Save" });
    await expect(saveButton).toBeVisible();
    await saveButton.click({ force: true });

    // 6. Verify reading is rendered locally in the UI
    await expect(
      page
        .getByRole("tabpanel", { name: "Meditation Readings" })
        .getByText(testTitle),
    ).toBeVisible({ timeout: 5000 });

    // 7. Verify directly in Backend API that it does NOT exist yet (network failed)
    const checkBefore = await request.get(
      "http://localhost:8788/v1/readings?limit=50",
    );
    expect(checkBefore.ok()).toBe(true);
    const beforeJson = await checkBefore.json();
    const beforeItems = beforeJson.items ?? beforeJson.data?.items ?? [];
    expect(
      beforeItems.some(
        (item: any) => item.translations?.es?.title === testTitle,
      ),
    ).toBe(false);

    // 8. Restore network connectivity to Backend (Go Online)
    await page.unroute("**/v1/**");
    await page.evaluate(() => window.dispatchEvent(new Event("online")));

    // 9. Verify with polling that SyncEngine automatically drains outbox to Backend API
    await expect
      .poll(
        async () => {
          const res = await request.get(
            "http://localhost:8788/v1/readings?limit=50",
          );
          if (!res.ok()) return false;
          const json = await res.json();
          const items = json.items ?? json.data?.items ?? [];
          return items.some(
            (item: any) => item.translations?.es?.title === testTitle,
          );
        },
        {
          intervals: [500, 1000],
          timeout: 15000,
        },
      )
      .toBe(true);
  });
});
