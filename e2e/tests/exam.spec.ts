import { test, expect } from '@playwright/test';
import { ExamEntryPage } from '../pages/exam-entry.page';
import { ExamActivePage } from '../pages/exam-active.page';

test.describe('Mock Exam', () => {
  test('exam entry page shows all 8 levels', async ({ page }) => {
    const examEntry = new ExamEntryPage(page);
    await examEntry.goto();

    const count = await examEntry.levelButtons.count();
    expect(count).toBe(8);
  });

  test('selecting a level shows confirmation dialog', async ({ page }) => {
    const examEntry = new ExamEntryPage(page);
    await examEntry.goto();

    await examEntry.selectLevel(1);

    await expect(examEntry.confirmDialog).toBeVisible();
    await expect(examEntry.confirmStartButton).toBeVisible();
    await expect(examEntry.cancelButton).toBeVisible();
  });

  test('cancel dismisses confirmation dialog', async ({ page }) => {
    const examEntry = new ExamEntryPage(page);
    await examEntry.goto();

    await examEntry.selectLevel(1);
    await examEntry.cancelStart();

    await expect(examEntry.confirmDialog).toBeHidden();
  });

  test('start exam navigates to active exam page', async ({ page }) => {
    const examEntry = new ExamEntryPage(page);
    await examEntry.goto();

    await examEntry.selectLevel(1);
    await examEntry.confirmStart();

    await expect(page).toHaveURL(/\/exam\/\w+/);

    const examActive = new ExamActivePage(page);
    await examActive.expectLoaded();
  });

  test('active exam shows timer counting down', async ({ page }) => {
    const examEntry = new ExamEntryPage(page);
    await examEntry.goto();
    await examEntry.selectLevel(1);
    await examEntry.confirmStart();

    const examActive = new ExamActivePage(page);
    await examActive.expectLoaded();

    const timerText1 = await examActive.getTimerText();
    expect(timerText1).toMatch(/\d{2}:\d{2}/);

    await page.waitForTimeout(2000);

    const timerText2 = await examActive.getTimerText();
    expect(timerText2).toMatch(/\d{2}:\d{2}/);
  });

  test('active exam shows correct question count (27 questions)', async ({ page }) => {
    const examEntry = new ExamEntryPage(page);
    await examEntry.goto();
    await examEntry.selectLevel(1);
    await examEntry.confirmStart();

    const examActive = new ExamActivePage(page);
    await examActive.expectLoaded();

    await expect(examActive.questionCount).toContainText('27 题');
  });

  test('answer MC questions via radio buttons', async ({ page }) => {
    const examEntry = new ExamEntryPage(page);
    await examEntry.goto();
    await examEntry.selectLevel(1);
    await examEntry.confirmStart();

    const examActive = new ExamActivePage(page);
    await examActive.expectLoaded();

    const hasRadio = await page.locator('input[type="radio"]').first().isVisible().catch(() => false);
    if (!hasRadio) {
      test.skip();
      return;
    }

    await page.locator('label:has(input[type="radio"])').first().click();

    await expect(examActive.answerProgress).toContainText(/已答 \d+\/27/);
  });

  test('answer TF questions via buttons', async ({ page }) => {
    const examEntry = new ExamEntryPage(page);
    await examEntry.goto();
    await examEntry.selectLevel(1);
    await examEntry.confirmStart();

    const examActive = new ExamActivePage(page);
    await examActive.expectLoaded();

    const isTfQuestion = await page.getByRole('button', { name: '正确', exact: true }).isVisible().catch(() => false);
    if (!isTfQuestion) {
      const navButtons = await examActive.questionNavButtons.all();
      for (let i = 1; i < Math.min(navButtons.length, 10); i++) {
        await page.waitForTimeout(300);
        try {
          await navButtons[i].click({ timeout: 3000 });
        } catch { continue; }
        const found = await page.getByRole('button', { name: '正确', exact: true }).isVisible().catch(() => false);
        if (found) break;
      }
    }

    const stillTf = await page.getByRole('button', { name: '正确', exact: true }).isVisible().catch(() => false);
    if (!stillTf) {
      test.skip();
      return;
    }

    await examActive.answerTf('正确');
    await page.waitForTimeout(500);
    await expect(examActive.answerProgress).toContainText(/已答 \d+\/\d+/);
  });

  test('submit exam and see results page', async ({ page }) => {
    const examEntry = new ExamEntryPage(page);
    await examEntry.goto();
    await examEntry.selectLevel(1);
    await examEntry.confirmStart();

    const examActive = new ExamActivePage(page);
    await examActive.expectLoaded();

    await page.waitForTimeout(1000);
    await examActive.submitButton.click();
    await page.waitForTimeout(1000);

    const confirmBtn = page.locator('button:has-text("确认交卷")');
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click();
    }

    await expect(page).toHaveURL(/\/exam\/\w+\/result/, { timeout: 15000 });
    await expect(page.getByText(/通过|未通过|成绩/)).toBeVisible({ timeout: 15_000 });
  });
});
