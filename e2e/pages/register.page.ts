import { type Page, type Locator, expect } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly nameInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly loginLink: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: '注册' });
    this.emailInput = page.locator('label:text-is("邮箱") + input');
    this.passwordInput = page.locator('label:text-is("密码") + input');
    this.nameInput = page.locator('label:text-is("姓名") + input');
    this.submitButton = page.getByRole('button', { name: '注册' });
    this.errorMessage = page.locator('.text-red-500');
    this.loginLink = page.getByRole('link', { name: '登录' });
  }

  async goto() {
    await this.page.goto('/register');
    await expect(this.heading).toBeVisible();
  }

  async register(email: string, password: string, name: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.nameInput.fill(name);
    await this.submitButton.click();
  }

  async expectError(msg?: string) {
    await expect(this.errorMessage).toBeVisible();
    if (msg) {
      await expect(this.errorMessage).toContainText(msg);
    }
  }

  async expectRedirectToHome() {
    await expect(this.page).toHaveURL('/');
  }
}
