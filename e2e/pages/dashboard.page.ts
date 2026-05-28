import { type Page, type Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly totalAnswered: Locator;
  readonly accuracy: Locator;
  readonly streak: Locator;
  readonly levelCards: Locator;
  readonly recentHistory: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: '学习进度' });
    this.totalAnswered = page.getByText('总答题数').locator('..');
    this.accuracy = page.getByText('正确率').locator('..');
    this.streak = page.getByText('已考级别').locator('..');
    this.levelCards = page.locator('[class*="grid-cols"] > div');
    this.recentHistory = page.getByText('最近作答').locator('..');
    this.loadingIndicator = page.getByText('加载中...');
  }

  async goto() {
    await this.page.goto('/progress');
    await this.page.waitForLoadState('networkidle');
  }

  async expectStatsVisible() {
    await expect(this.heading).toBeVisible();
    await expect(this.totalAnswered).toBeVisible();
    await expect(this.accuracy).toBeVisible();
    await expect(this.streak).toBeVisible();
  }
}
