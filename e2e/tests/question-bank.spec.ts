import { test, expect } from '@playwright/test';
import { QuestionBankPage } from '../pages/question-bank.page';

test.describe('Question Bank', () => {
  let questionBank: QuestionBankPage;

  test.beforeEach(async ({ page }) => {
    questionBank = new QuestionBankPage(page);
    await questionBank.goto();
  });

  test('displays question bank with question cards', async () => {
    const count = await questionBank.getQuestionCount();
    expect(count).toBeGreaterThan(0);
  });

  test('filter by question type — single choice', async ({ page }) => {
    await questionBank.filterByType('单选');

    const cards = await questionBank.getQuestionCount();
    if (cards > 0) {
      await expect(page.locator('.text-blue-700').first()).toBeVisible();
    }
  });

  test('filter by question type — true/false', async ({ page }) => {
    await questionBank.filterByType('判断');

    const cards = await questionBank.getQuestionCount();
    if (cards > 0) {
      await expect(page.locator('.text-green-700').first()).toBeVisible();
    }
  });

  test('filter by question type — programming', async ({ page }) => {
    await questionBank.filterByType('编程');

    const cards = await questionBank.getQuestionCount();
    if (cards > 0) {
      await expect(page.locator('.text-purple-700').first()).toBeVisible();
    }
  });

  test('click question card navigates to detail page', async ({ page }) => {
    await questionBank.clickQuestion(0);

    await expect(page).toHaveURL(/\/questions\//);
    await expect(page.getByText(/返回/)).toBeVisible();
  });

  test('pagination navigates between pages', async () => {
    const hasPagination = await questionBank.paginationNext.isVisible().catch(() => false);
    if (!hasPagination) {
      test.skip();
      return;
    }

    await questionBank.paginationNext.click();
    await questionBank.page.waitForLoadState('networkidle');

    const prevVisible = await questionBank.paginationPrev.isVisible();
    expect(prevVisible).toBe(true);
  });
});
