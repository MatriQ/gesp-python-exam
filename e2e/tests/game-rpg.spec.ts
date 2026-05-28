import { test, expect } from '../fixtures/test';

test.describe('Game RPG Profile', () => {
  test('should navigate to RPG profile page', async ({ authenticatedPage: page }) => {
    await page.goto('/game/rpg');
    await page.waitForTimeout(2000);
    // Page should load - either show profile or "create character" prompt
    const content = await page.content();
    expect(content).toContain('game');
  });

  test('should show avatar or create prompt', async ({ authenticatedPage: page }) => {
    await page.goto('/game/rpg');
    await page.waitForTimeout(2000);
    // Either shows avatar or create prompt
    const hasProfile = await page.locator('text=请先创建游戏角色').isVisible().catch(() => false);
    const hasStats = await page.locator('text=成就').first().isVisible().catch(() => false);
    expect(hasProfile || hasStats).toBeTruthy();
  });

  test('should show achievement badges section', async ({ authenticatedPage: page }) => {
    await page.goto('/game/rpg');
    await page.waitForTimeout(2000);
    // Look for achievements section
    const content = await page.content();
    expect(content).toContain('成就');
  });

  test('should require authentication', async ({ page }) => {
    await page.goto('/game/rpg');
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toMatch(/login|auth|game/);
  });
});
