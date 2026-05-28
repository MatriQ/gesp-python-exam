import { type Page, type Locator, expect } from '@playwright/test';

export class QuestionBankPage {
  readonly page: Page;
  readonly questionCards: Locator;
  readonly loadingIndicator: Locator;
  readonly emptyState: Locator;
  readonly paginationPrev: Locator;
  readonly paginationNext: Locator;
  readonly sessionSelect: Locator;

  constructor(page: Page) {
    this.page = page;
    this.questionCards = page.locator('[class*="bg-white rounded-xl border"]');
    this.loadingIndicator = page.getByText('加载中...');
    this.emptyState = page.getByText('暂无题目');
    this.paginationPrev = page.getByRole('button', { name: '上一页' });
    this.paginationNext = page.getByRole('button', { name: '下一页' });
    this.sessionSelect = page.locator('select');
  }

  async goto() {
    await this.page.goto('/questions');
    await this.page.waitForLoadState('networkidle');
  }

  async filterByType(typeLabel: string) {
    await this.page.getByRole('button', { name: typeLabel, exact: true }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async filterBySession(session: string) {
    await this.sessionSelect.selectOption({ label: session });
    await expect(this.loadingIndicator).toBeHidden();
  }

  async clickQuestion(index: number) {
    await this.questionCards.nth(index).click();
  }

  async getQuestionCount(): Promise<number> {
    return await this.questionCards.count();
  }

  async goToPage(pageNum: number) {
    await this.page.getByRole('button', { name: String(pageNum), exact: true }).click();
    await expect(this.loadingIndicator).toBeHidden();
  }
}
