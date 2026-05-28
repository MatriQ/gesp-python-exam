import { type Page, type Locator, expect } from '@playwright/test';

export class ErrorBookPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly totalErrorCount: Locator;
  readonly levelButtons: Locator;
  readonly typeButtons: Locator;
  readonly errorCards: Locator;
  readonly emptyState: Locator;
  readonly loadingIndicator: Locator;
  readonly paginationPrev: Locator;
  readonly paginationNext: Locator;
  readonly retryButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: '错题本' });
    this.totalErrorCount = page.locator('text=/共 \\d+ 道错题/');
    this.levelButtons = page.locator('.flex.flex-wrap.gap-2 button');
    this.typeButtons = page.locator('.flex.gap-2 button');
    this.errorCards = page.locator('[class*="bg-white rounded-xl border border-gray-200 p-5"]');
    this.emptyState = page.getByText('太棒了！没有错题');
    this.loadingIndicator = page.locator('.animate-pulse');
    this.paginationPrev = page.getByRole('button', { name: '上一页' });
    this.paginationNext = page.getByRole('button', { name: '下一页' });
    this.retryButton = page.getByRole('button', { name: '重做' });
  }

  async goto() {
    await this.page.goto('/errors');
    await expect(this.heading).toBeVisible({ timeout: 15000 });
  }

  async filterByLevel(level: number | '全部') {
    const label = level === '全部' ? '全部' : String(level);
    await this.page.getByRole('button', { name: label, exact: true }).click();
  }

  async filterByType(typeLabel: string) {
    await this.page.getByRole('button', { name: typeLabel, exact: true }).click();
  }

  async getErrorCount(): Promise<number> {
    return await this.errorCards.count();
  }

  async clickRetry(index: number) {
    await this.errorCards.nth(index).getByRole('button', { name: '重做' }).click();
  }

  async removeError(index: number) {
    await this.errorCards.nth(index).getByRole('button', { name: '移除' }).click();
    await this.errorCards.nth(index).getByRole('button', { name: '确认移除' }).click();
  }
}
