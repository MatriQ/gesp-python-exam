import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { RegisterPage } from '../pages/register.page';
import { generateTestUser, apiRegister } from '../helpers/auth';

test.describe('Auth — Registration', () => {
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page }) => {
    registerPage = new RegisterPage(page);
    await registerPage.goto();
  });

  test('register new user successfully', async ({ page }) => {
    const user = generateTestUser();

    await registerPage.register(user.email, user.password, user.name);

    await registerPage.expectRedirectToHome();
    await expect(page.locator('nav')).toContainText(user.name);
  });

  test('register with duplicate email shows error', async () => {
    const user = generateTestUser();
    await apiRegister(user);

    await registerPage.goto();
    await registerPage.register(user.email, user.password, user.name);

    await registerPage.expectError();
  });

  test('register with short password shows validation error', async ({ page }) => {
    const user = generateTestUser();
    await registerPage.register(user.email, 'short', user.name);

    await expect(page.getByText(/至少.*8|too short|min.*8|Validation/i)).toBeVisible();
  });

  test('register link navigates to register page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.registerLink.click();
    await expect(page).toHaveURL('/register');
  });
});

test.describe('Auth — Login', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('login with correct credentials', async ({ page }) => {
    const user = generateTestUser();
    await apiRegister(user);

    await loginPage.goto();
    await loginPage.login(user.email, user.password);

    await loginPage.expectRedirectToHome();
    await expect(page.locator('nav')).toContainText(user.name);
  });

  test('login with wrong password shows error', async () => {
    const user = generateTestUser();
    await apiRegister(user);

    await loginPage.goto();
    await loginPage.login(user.email, 'WrongPassword123!');

    await loginPage.expectError();
  });

  test('login with non-existent email shows error', async () => {
    await loginPage.login('nonexistent@test.com', 'SomePassword123!');

    await loginPage.expectError();
  });

  test('login link navigates to login page', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.loginLink.click();
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Auth — Protected routes', () => {
  test('unauthenticated access to dashboard loads page', async ({ page }) => {
    const response = await page.goto('/progress');
    expect(response!.status()).toBe(200);
  });
});
