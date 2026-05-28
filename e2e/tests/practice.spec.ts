import { test, expect } from '@playwright/test';
import { PracticePage } from '../pages/practice.page';

test.describe('Practice Mode', () => {
  let practice: PracticePage;

  test.beforeEach(async ({ page }) => {
    practice = new PracticePage(page);
    await practice.goto();
  });

  test('displays a question with counter', async () => {
    await expect(practice.questionCounter).toBeVisible();
    await expect(practice.questionText).toBeVisible();
  });

  test('answer MC question and see feedback', async ({ page }) => {
    const hasOptions = await page.locator('button:has-text("."):not([disabled])').first().isVisible().catch(() => false);
    if (!hasOptions) {
      test.skip();
      return;
    }

    await practice.selectOption('A');
    await practice.submit();

    await expect(page.getByText(/回答正确|回答错误/)).toBeVisible({ timeout: 10000 });

    await practice.next();
    await expect(practice.questionCounter).toBeVisible();
  });

  test('answer TF question and see feedback', async ({ page }) => {
    const isTf = await page.getByRole('button', { name: '正确', exact: true }).isVisible().catch(() => false);
    if (!isTf) {
      test.skip();
      return;
    }

    await practice.selectTrueFalse('正确');
    await practice.submit();

    const hasFeedback = await practice.correctFeedback.isVisible().catch(() => false) ||
                        await practice.wrongFeedback.isVisible().catch(() => false);
    expect(hasFeedback).toBe(true);
  });

  test('practice shows next question after answering', async ({ page }) => {
    const hasOptions = await page.locator('button:has-text("."):not([disabled])').first().isVisible().catch(() => false);
    const isTf = await page.getByRole('button', { name: '正确', exact: true }).isVisible().catch(() => false);

    if (!hasOptions && !isTf) {
      test.skip();
      return;
    }

    if (isTf) {
      await practice.selectTrueFalse('正确');
    } else {
      await practice.selectOption('A');
    }
    await practice.submit();
    await practice.next();

    await expect(practice.questionText).toBeVisible();
  });
});
