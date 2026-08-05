import { test, expect } from '@playwright/test';
import { installMocks, TEST_USER, API } from './fixtures/mockApi.js';

test.describe('Authentication flows', () => {
  test('login with valid credentials redirects home and shows the profile', async ({ page }) => {
    await installMocks(page, { user: TEST_USER });

    await page.route(`${API}/auth/login`, (route) =>
      route.fulfill({
        json: {
          success: true,
          message: 'Login successful',
          data: { user: TEST_USER, accessToken: 'tok', refreshToken: 'ref' },
        },
      })
    );

    await page.goto('/login');
    await page.locator('.login-form-input[type="email"]').fill('test@animeregistry.dev');
    await page.locator('.login-form-input[type="password"]').fill('Password1!');
    await page.locator('.login-btn-primary').click();

    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
    await expect(page.locator('.profile-button')).toBeVisible({ timeout: 10_000 });
  });

  test('login shows an error message for invalid credentials', async ({ page }) => {
    await installMocks(page);

    await page.route(`${API}/auth/login`, (route) =>
      route.fulfill({
        status: 401,
        json: { success: false, message: 'Invalid email or password' },
      })
    );

    await page.goto('/login');
    await page.locator('.login-form-input[type="email"]').fill('nope@animeregistry.dev');
    await page.locator('.login-form-input[type="password"]').fill('WrongPass1!');
    await page.locator('.login-btn-primary').click();

    await expect(page.locator('.login-message-error')).toContainText('Invalid email or password');
    await expect(page).not.toHaveURL(/\/$/);
  });

  test('login blocks empty fields with a validation message', async ({ page }) => {
    await installMocks(page);
    await page.goto('/login');
    await page.locator('.login-btn-primary').click();

    // Native `required` validation blocks the submit before the app's JS runs
    const msg = await page.locator('.login-form-input[type="email"]').evaluate((el) => el.validationMessage);
    expect(msg).not.toBe('');
    await expect(page).toHaveURL(/\/login/);
  });

  test('registration enforces password policy', async ({ page }) => {
    await installMocks(page);
    await page.goto('/register');

    // 7 chars passes the native minLength={6} but fails the app's 8-char rule
    await page.locator('#email').fill('new@animeregistry.dev');
    await page.locator('#password').fill('short1!');
    await page.locator('#confirmPassword').fill('short1!');
    await page.locator('.btn-primary').click();

    await expect(page.locator('.message-error')).toContainText('at least 8 characters');
  });

  test('registration with valid input redirects home', async ({ page }) => {
    await installMocks(page, { user: TEST_USER });

    await page.route(`${API}/auth/register`, (route) =>
      route.fulfill({
        status: 201,
        json: {
          success: true,
          message: 'Registration successful',
          data: { user: TEST_USER, accessToken: 'tok', refreshToken: 'ref' },
        },
      })
    );

    await page.goto('/register');
    await page.locator('#email').fill('new@animeregistry.dev');
    await page.locator('#password').fill('Password1!');
    await page.locator('#confirmPassword').fill('Password1!');
    await page.locator('.btn-primary').click();

    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
  });
});
