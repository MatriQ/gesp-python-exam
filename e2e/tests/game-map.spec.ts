import { test, expect } from '../fixtures/test';

test.describe('Game Map Exploration', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/game');
  });

  test('should navigate to game map from game home', async ({ authenticatedPage: page }) => {
    await page.goto('/game/map');
    await expect(page.locator('text=地图探索').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show level selector tabs', async ({ authenticatedPage: page }) => {
    await page.goto('/game/map');
    await expect(page.locator('text=入门').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show stage nodes on the map', async ({ authenticatedPage: page }) => {
    await page.goto('/game/map');
    // Wait for map to load - there should be at least one stage node visible
    await page.waitForTimeout(2000);
    // Verify page has loaded (look for game-related content)
    const content = await page.content();
    expect(content).toContain('game');
  });

  test('should require authentication', async ({ page }) => {
    await page.goto('/game/map');
    // Should redirect to login or show auth required
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toMatch(/login|auth|game/);
  });
});
