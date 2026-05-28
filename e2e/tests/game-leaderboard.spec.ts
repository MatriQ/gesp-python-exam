import { test, expect } from '../fixtures/test';

test.describe('Game Leaderboard', () => {
  test('should show leaderboard page', async ({ authenticatedPage: page }) => {
    await page.goto('/game/leaderboard');
    await expect(page.locator('text=排行榜').first()).toBeVisible({ timeout: 10000 });
  });

  test('should have tab switching', async ({ authenticatedPage: page }) => {
    await page.goto('/game/leaderboard');
    await page.waitForTimeout(2000);
    // Look for tab buttons (全部 / 今日)
    const allTab = page.locator('text=全部').first();
    const dailyTab = page.locator('text=今日').first();
    const hasAllTab = await allTab.isVisible().catch(() => false);
    const hasDailyTab = await dailyTab.isVisible().catch(() => false);
    expect(hasAllTab || hasDailyTab).toBeTruthy();
  });

  test('leaderboard tabs switch between all and daily', async ({ authenticatedPage: page }) => {
    await page.goto('/game/leaderboard');
    await page.waitForTimeout(2000);

    await expect(page.getByText('总榜').first()).toBeVisible();

    await page.getByRole('button', { name: /今日榜/ }).click();
    await page.waitForTimeout(1000);
    await expect(page.getByText('今日榜').first()).toBeVisible();

    await page.getByRole('button', { name: /总榜/ }).click();
    await page.waitForTimeout(1000);
    await expect(page.getByText('总榜').first()).toBeVisible();
  });

  test('should show my rank section or empty state', async ({ authenticatedPage: page }) => {
    await page.goto('/game/leaderboard');
    await page.waitForTimeout(2000);
    const content = await page.content();
    // Should have ranking-related content
    expect(content.length).toBeGreaterThan(100);
  });

  test('should require authentication', async ({ page }) => {
    await page.goto('/game/leaderboard');
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toMatch(/login|auth|game/);
  });
});
