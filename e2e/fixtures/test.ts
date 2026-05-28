import { test as base, type Page, type BrowserContext } from '@playwright/test';

interface AuthCredentials {
  email: string;
  password: string;
  name: string;
}

interface Fixtures {
  authenticatedPage: Page;
  authHelper: {
    register: (creds?: Partial<AuthCredentials>) => Promise<{ email: string; password: string; name: string }>;
    login: (email: string, password: string) => Promise<void>;
    getAuthState: () => Promise<{ token: string; user: unknown } | null>;
  };
}

export const test = base.extend<Fixtures>({
  authenticatedPage: async ({ browser, storageState }, use) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  authHelper: async ({ page }, use) => {
    const helper = {
      async register(creds?: Partial<AuthCredentials>) {
        const email = creds?.email || `e2e_${Date.now()}@test.com`;
        const password = creds?.password || 'TestPass123!';
        const name = creds?.name || 'E2E Test User';

        await page.goto('/register');
        await page.getByLabel('邮箱').fill(email);
        await page.getByLabel('密码').fill(password);
        await page.getByLabel('姓名').fill(name);
        await page.getByRole('button', { name: '注册' }).click();

        return { email, password, name };
      },

      async login(email: string, password: string) {
        await page.goto('/login');
        await page.getByLabel('邮箱').fill(email);
        await page.getByLabel('密码').fill(password);
        await page.getByRole('button', { name: '登录' }).click();
        await page.waitForURL('/');
      },

      async getAuthState() {
        const token = await page.evaluate(() => localStorage.getItem('token'));
        const userStr = await page.evaluate(() => localStorage.getItem('user'));
        if (token && userStr) {
          return { token, user: JSON.parse(userStr) };
        }
        return null;
      },
    };
    await use(helper);
  },
});

export { expect } from '@playwright/test';
