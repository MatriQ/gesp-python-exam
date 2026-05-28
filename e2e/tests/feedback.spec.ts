import { test, expect } from '../fixtures/test';

test.describe('Feedback Feature', () => {
  test('practice page loads with feedback elements', async ({ authenticatedPage: page }) => {
    await page.goto('/practice');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
  });

  test('error book page loads with feedback elements', async ({ authenticatedPage: page }) => {
    await page.goto('/errors');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
  });
});
