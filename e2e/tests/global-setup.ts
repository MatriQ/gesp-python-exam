import { test as base, expect } from '@playwright/test';
import { apiRegister, generateTestUser, uiLogin, type TestUser } from '../helpers/auth';

base('global setup — create authenticated state', async ({ page }) => {
  const user = generateTestUser();
  const registered = await apiRegister(user);

  await uiLogin(page, user.email, user.password);

  await expect(page.locator('nav')).toContainText(user.name);

  await page.context().storageState({ path: '.auth/user.json' });
});
