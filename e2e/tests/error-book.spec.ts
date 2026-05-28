import { test, expect } from '@playwright/test';
import { ErrorBookPage } from '../pages/error-book.page';

test.describe('Error Book', () => {
  let errorBook: ErrorBookPage;

  test.beforeEach(async ({ page }) => {
    errorBook = new ErrorBookPage(page);
    await errorBook.goto();
  });

  test('error book page loads with heading', async () => {
    await expect(errorBook.heading).toBeVisible();
  });

  test('error book shows empty state when no errors', async () => {
    const hasErrors = await errorBook.errorCards.first().isVisible().catch(() => false);
    if (!hasErrors) {
      await expect(errorBook.emptyState).toBeVisible();
    }
  });

  test('error book displays level filter buttons', async () => {
    const levelBtnCount = await errorBook.levelButtons.count();
    expect(levelBtnCount).toBe(9);
  });

  test('error book displays type filter tabs', async () => {
    await expect(errorBook.page.getByRole('button', { name: '选择题' })).toBeVisible();
    await expect(errorBook.page.getByRole('button', { name: '判断题' })).toBeVisible();
    await expect(errorBook.page.getByRole('button', { name: '编程题' })).toBeVisible();
  });

  test('error book retry button navigates to practice', async ({ page }) => {
    const hasCards = await errorBook.errorCards.first().isVisible().catch(() => false);
    if (!hasCards) {
      test.skip();
      return;
    }

    await errorBook.clickRetry(0);
    await expect(page).toHaveURL(/\/practice/);
  });
});
