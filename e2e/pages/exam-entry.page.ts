import { type Page, type Locator, expect } from '@playwright/test';

export class ExamEntryPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly levelButtons: Locator;
  readonly confirmDialog: Locator;
  readonly confirmStartButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'GESP 模拟考试' });
    this.levelButtons = page.locator('button:has-text("Level")');
    this.confirmDialog = page.locator('.fixed.inset-0');
    this.confirmStartButton = page.getByRole('button', { name: '开始考试' });
    this.cancelButton = page.getByRole('button', { name: '取消' });
  }

  async goto() {
    await this.page.goto('/exam');
    await expect(this.heading).toBeVisible();
  }

  async selectLevel(level: number) {
    await this.page.locator(`button:has-text("Level ${level}")`).click();
    await expect(this.confirmDialog).toBeVisible();
  }

  async confirmStart() {
    await this.confirmStartButton.click();
  }

  async cancelStart() {
    await this.cancelButton.click();
  }
}
