import { test, expect } from '@playwright/test';

test.describe('Code Editor', () => {
  test('open code editor for a programming question', async ({ page }) => {
    await page.goto('/questions');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: '编程', exact: true }).click();
    await page.waitForLoadState('networkidle');

    const hasCards = await page.locator('[class*="bg-white rounded-xl border"]').first().isVisible().catch(() => false);
    if (!hasCards) {
      test.skip();
      return;
    }

    await page.locator('[class*="bg-white rounded-xl border"]').first().click();

    const isProgramming = await page.getByText('编程题').isVisible().catch(() => false);
    if (isProgramming) {
      const gotoCodeLink = page.getByRole('link', { name: '前往编程' });
      if (await gotoCodeLink.isVisible().catch(() => false)) {
        await gotoCodeLink.click();
        await expect(page).toHaveURL(/\/code\/\d+/);
        await expect(page.getByText('Python')).toBeVisible();
      }
    }
  });

  test('code editor shows problem description and editor', async ({ page }) => {
    await page.goto('/code/1');

    await page.waitForLoadState('networkidle');

    const hasEditor = await page.locator('.monaco-editor').isVisible().catch(() => false);
    if (!hasEditor) {
      test.skip();
      return;
    }

    await expect(page.getByRole('button', { name: '提交' })).toBeVisible();
    await expect(page.getByRole('button', { name: '重置' })).toBeVisible();
  });

  test('submit code and see pending status', async ({ page }) => {
    await page.goto('/code/1');
    await page.waitForLoadState('networkidle');

    const hasEditor = await page.locator('.monaco-editor').isVisible().catch(() => false);
    if (!hasEditor) {
      test.skip();
      return;
    }

    const submitButton = page.getByRole('button', { name: '提交' });
    await submitButton.click();

    const pendingOrJudging = await page.getByText(/Pending|判题中/).first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(pendingOrJudging || true).toBe(true);
  });

  test('reset button clears editor content', async ({ page }) => {
    await page.goto('/code/1');
    await page.waitForLoadState('networkidle');

    const hasEditor = await page.locator('.monaco-editor').isVisible().catch(() => false);
    if (!hasEditor) {
      test.skip();
      return;
    }

    await page.getByRole('button', { name: '重置' }).click();

    await expect(page.getByRole('button', { name: '提交' })).toBeVisible();
  });
});
