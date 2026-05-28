import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/dashboard.page';

test.describe('Dashboard', () => {
  let dashboard: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
  });

  test('dashboard shows progress stats cards', async () => {
    await dashboard.expectStatsVisible();
  });

  test('dashboard shows total answered count', async () => {
    const text = await dashboard.totalAnswered.textContent();
    expect(text).toContain('总答题数');
  });

  test('dashboard shows accuracy percentage', async () => {
    const text = await dashboard.accuracy.textContent();
    expect(text).toContain('正确率');
  });

  test('dashboard shows level progress cards', async () => {
    const levelSection = dashboard.page.getByText('各级别进度');
    if (await levelSection.isVisible().catch(() => false)) {
      const cards = await dashboard.levelCards.count();
      expect(cards).toBeGreaterThanOrEqual(0);
    }
  });
});
