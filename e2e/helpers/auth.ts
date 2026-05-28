import { type Page, expect } from '@playwright/test';

const API_BASE = (process.env.E2E_API_URL || 'http://localhost:3000') + '/api';

export interface TestUser {
  email: string;
  password: string;
  name: string;
  token?: string;
}

export async function apiRegister(user: TestUser): Promise<TestUser> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: user.password, name: user.name }),
  });
  if (!res.ok) {
    throw new Error(`Register failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return { ...user, token: data.token };
}

export async function apiLogin(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.token;
}

export async function uiLogin(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('label:text-is("邮箱") + input').fill(email);
  await page.locator('label:text-is("密码") + input').fill(password);
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL('/');
}

export async function uiRegister(page: Page, email: string, password: string, name: string) {
  await page.goto('/register');
  await page.locator('label:text-is("邮箱") + input').fill(email);
  await page.locator('label:text-is("密码") + input').fill(password);
  await page.locator('label:text-is("姓名") + input').fill(name);
  await page.getByRole('button', { name: '注册' }).click();
  await expect(page).toHaveURL('/');
}

export function generateTestUser(): TestUser {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return {
    email: `e2e_${id}@test.com`,
    password: 'TestPass123!',
    name: `E2E_${id}`,
  };
}

export async function waitForApi(page: Page, urlPattern: string | RegExp) {
  await page.waitForResponse((resp) => {
    const url = resp.url();
    if (typeof urlPattern === 'string') return url.includes(urlPattern);
    return urlPattern.test(url);
  });
}
