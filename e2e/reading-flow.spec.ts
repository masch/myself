import { test, expect } from "@playwright/test";

test.describe("E2E Browser Meditation Reading Flow", () => {
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

    // 2. Open frontend in real browser
    await page.goto("/readings");
    await expect(page).toHaveTitle(/myself|Readings/i);

    // 3. Open New Reading Modal
    // In mobile web, header or plus button navigates to modal
    const plusButton = page
      .locator('button, [role="button"]')
      .filter({ hasText: /\+/ })
      .first();
    if (await plusButton.isVisible()) {
      await plusButton.click();
    } else {
      await page.goto("/reading-modal");
    }

    // 4. Create new author via UI ABM
    const newAuthorBtn = page.getByRole("button", { name: "+ New author" });
    await expect(newAuthorBtn).toBeVisible({ timeout: 5000 });
    await newAuthorBtn.click();

    const authorInput = page.getByPlaceholder(/Author name/i);
    await expect(authorInput).toBeVisible({ timeout: 5000 });
    await authorInput.fill("Marcus Aurelius");

    // 5. Fill in the reading form
    const testTitle = `E2E Browser Test ${Date.now()}`;
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

    // 6. Verify directly in Backend API that reading was created
    // Polling API endpoint /v1/readings
    await expect
      .poll(
        async () => {
          const res = await request.get(
            "http://localhost:8788/v1/readings?limit=50",
          );
          if (!res.ok()) return false;
          const json = await res.json();
          const items = json.items ?? json.data?.items ?? [];
          return items.some((item: any) =>
            item.translations?.es?.title?.includes("E2E Browser Test"),
          );
        },
        {
          intervals: [500, 1000],
          timeout: 10000,
        },
      )
      .toBe(true);

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

    // 10. Verify directly in Backend API that reading was updated
    await expect
      .poll(
        async () => {
          const res = await request.get(
            "http://localhost:8788/v1/readings?limit=50",
          );
          if (!res.ok()) return false;
          const json = await res.json();
          const items = json.items ?? json.data?.items ?? [];
          return items.some((item: any) =>
            item.translations?.es?.title?.includes("(Updated)"),
          );
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

    // 12. Verify directly in Backend API that reading was deleted
    await expect
      .poll(
        async () => {
          const res = await request.get(
            "http://localhost:8788/v1/readings?limit=50",
          );
          if (!res.ok()) return false;
          const json = await res.json();
          const items = json.items ?? json.data?.items ?? [];
          return !items.some((item: any) =>
            item.translations?.es?.title?.includes("(Updated)"),
          );
        },
        {
          intervals: [500, 1000],
          timeout: 10000,
        },
      )
      .toBe(true);
  });
});
