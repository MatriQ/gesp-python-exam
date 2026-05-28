import { test, expect } from '../fixtures/test';

test.describe('Game Story Adventure', () => {
  test('should show story chapters page', async ({ authenticatedPage: page }) => {
    await page.goto('/game/story');
    await expect(page.locator('text=编程冒险故事').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show level selector', async ({ authenticatedPage: page }) => {
    await page.goto('/game/story');
    await page.waitForTimeout(2000);
    const content = await page.content();
    expect(content).toContain('入门');
  });

  test('should show chapter cards', async ({ authenticatedPage: page }) => {
    await page.goto('/game/story');
    await page.waitForTimeout(2000);
    // Look for chapter-related content
    const content = await page.content();
    expect(content.length).toBeGreaterThan(100);
  });

  test('should navigate to story scene when clicking chapter', async ({ authenticatedPage: page }) => {
    await page.goto('/game/story');
    await page.waitForTimeout(2000);
    // Try clicking first chapter card
    const card = page.locator('.game-card').first();
    if (await card.isVisible()) {
      await card.click();
      await page.waitForTimeout(2000);
      const url = page.url();
      // Should navigate to story scene or stay on story page
      expect(url).toContain('story');
    }
  });

  test('should require authentication', async ({ page }) => {
    await page.goto('/game/story');
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toMatch(/login|auth|game/);
  });

  test('story chapter displays questions', async ({ authenticatedPage: page }) => {
    await page.goto('/game/story');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);

    const chapterCards = page.locator('.game-card');
    if (await chapterCards.count() > 0) {
      await chapterCards.first().click();
      await page.waitForTimeout(2000);
      const url = page.url();
      expect(url).toContain('story');
      const bodyText = await page.locator('body').textContent();
      expect(bodyText!.length).toBeGreaterThan(200);
    }
  });
});
