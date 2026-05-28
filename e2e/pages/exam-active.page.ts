import { type Page, type Locator, expect } from '@playwright/test';

export class ExamActivePage {
  readonly page: Page;
  readonly timer: Locator;
  readonly questionCount: Locator;
  readonly answerProgress: Locator;
  readonly prevButton: Locator;
  readonly nextButton: Locator;
  readonly submitButton: Locator;
  readonly submitConfirmDialog: Locator;
  readonly confirmSubmitButton: Locator;
  readonly continueButton: Locator;
  readonly questionNavButtons: Locator;

  constructor(page: Page) {
    this.page = page;
    this.timer = page.getByText(/\d+:\d{2}/).first();
    this.questionCount = page.getByText(/模拟考试.{1,3}\d+ 题/);
    this.answerProgress = page.getByText(/已答 \d+\/\d+/);
    this.prevButton = page.getByRole('button', { name: '上一题' });
    this.nextButton = page.getByRole('button', { name: '下一题' });
    this.submitButton = page.getByRole('button', { name: '交卷' });
    this.submitConfirmDialog = page.locator('.fixed.inset-0');
    this.confirmSubmitButton = page.getByRole('button', { name: '确认交卷' });
    this.continueButton = page.getByRole('button', { name: '继续答题' });
    this.questionNavButtons = page.locator('.grid.grid-cols-5 button, .flex.items-center.gap-1\\.5 button');
  }

  async expectLoaded() {
    await expect(this.timer).toBeVisible();
    await expect(this.questionCount).toBeVisible();
  }

  async getTimerText(): Promise<string> {
    return (await this.timer.textContent()) || '';
  }

  async answerMc(option: string) {
    await this.page.locator(`label:has-text("${option}.")`).click();
  }

  async answerTf(answer: '正确' | '错误') {
    await this.page.getByRole('button', { name: answer, exact: true }).click();
  }

  async navigateToQuestion(index: number) {
    await this.page.waitForTimeout(500);
    await this.questionNavButtons.nth(index).click({ timeout: 5000 }).catch(() => {});
  }

  async submit() {
    await this.submitButton.click();
    await this.page.waitForTimeout(500);
    const confirmBtn = this.page.locator('button:has-text("确认交卷"), button:has-text("提交中")');
    await confirmBtn.first().click({ timeout: 10000 });
  }
}
