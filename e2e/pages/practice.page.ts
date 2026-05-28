import { type Page, type Locator, expect } from '@playwright/test';

export class PracticePage {
  readonly page: Page;
  readonly questionText: Locator;
  readonly submitButton: Locator;
  readonly nextButton: Locator;
  readonly correctFeedback: Locator;
  readonly wrongFeedback: Locator;
  readonly loadingIndicator: Locator;
  readonly questionCounter: Locator;
  readonly programmaticLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.questionText = page.locator('[class*="whitespace-pre-wrap"]');
    this.submitButton = page.getByRole('button', { name: '提交' });
    this.nextButton = page.getByRole('button', { name: '下一题' });
    this.correctFeedback = page.getByText('回答正确');
    this.wrongFeedback = page.getByText('回答错误');
    this.loadingIndicator = page.getByText('加载中...');
    this.questionCounter = page.locator('text=/第 \\d+ 题/');
    this.programmaticLink = page.getByRole('link', { name: '前往编程' });
  }

  async goto() {
    await this.page.goto('/practice');
    await this.page.waitForLoadState('networkidle');
  }

  async selectOption(label: string) {
    await this.page.getByRole('button', { name: new RegExp(`^${label}\\.`) }).click();
  }

  async selectTrueFalse(answer: '正确' | '错误') {
    await this.page.getByRole('button', { name: answer, exact: true }).click();
  }

  async submit() {
    await this.submitButton.click();
  }

  async next() {
    await this.nextButton.click();
    await expect(this.loadingIndicator).toBeHidden();
  }

  async expectCorrectFeedback() {
    await expect(this.correctFeedback).toBeVisible();
  }

  async expectWrongFeedback() {
    await expect(this.wrongFeedback).toBeVisible();
  }
}
