# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.js >> Authentication flows >> registration with valid input redirects home
- Location: e2e\auth.spec.js:70:7

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('.btn-primary')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic:
    - generic: 🌸
    - generic: ⚔️
    - generic: 🎌
  - generic [ref=e4]:
    - link "← Home" [ref=e5] [cursor=pointer]:
      - /url: /
      - generic [ref=e6]: ←
      - text: Home
    - heading "Join AnimeRegistry" [level=1] [ref=e8]
    - generic [ref=e9]:
      - generic [ref=e10]:
        - generic [ref=e12]:
          - generic:
            - img "Email Icon"
          - textbox "Enter your email" [ref=e13]: new@animeregistry.dev
        - generic [ref=e15]:
          - generic:
            - img "Password Icon"
          - textbox "Password (min 8 chars, A-Z, 0-9, symbol)" [ref=e16]: Password1!
        - generic [ref=e18]:
          - generic:
            - img "Confirm Password Icon"
          - textbox "Confirm your password" [active] [ref=e19]: Password1!
        - button "Register →" [ref=e21] [cursor=pointer]:
          - generic [ref=e22]: Register
          - generic [ref=e23]: →
      - generic [ref=e24]: or continue with
      - button "Google Icon Sign Up With Google" [ref=e26] [cursor=pointer]:
        - img "Google Icon" [ref=e27]
        - generic [ref=e28]: Sign Up With Google
    - paragraph [ref=e30]:
      - text: Already part of the community ?
      - link "Login Here →" [ref=e31] [cursor=pointer]:
        - /url: /login
        - generic [ref=e32]: Login Here
        - generic [ref=e33]: →
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { installMocks, TEST_USER, API } from './fixtures/mockApi.js';
  3  | 
  4  | test.describe('Authentication flows', () => {
  5  |   test('login with valid credentials redirects home and shows the profile', async ({ page }) => {
  6  |     await installMocks(page, { user: TEST_USER });
  7  | 
  8  |     await page.route(`${API}/auth/login`, (route) =>
  9  |       route.fulfill({
  10 |         json: {
  11 |           success: true,
  12 |           message: 'Login successful',
  13 |           data: { user: TEST_USER, accessToken: 'tok', refreshToken: 'ref' },
  14 |         },
  15 |       })
  16 |     );
  17 | 
  18 |     await page.goto('/login');
  19 |     await page.locator('.login-form-input[type="email"]').fill('test@animeregistry.dev');
  20 |     await page.locator('.login-form-input[type="password"]').fill('Password1!');
  21 |     await page.locator('.login-btn-primary').click();
  22 | 
  23 |     await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
  24 |     await expect(page.locator('.profile-button')).toBeVisible({ timeout: 10_000 });
  25 |   });
  26 | 
  27 |   test('login shows an error message for invalid credentials', async ({ page }) => {
  28 |     await installMocks(page);
  29 | 
  30 |     await page.route(`${API}/auth/login`, (route) =>
  31 |       route.fulfill({
  32 |         status: 401,
  33 |         json: { success: false, message: 'Invalid email or password' },
  34 |       })
  35 |     );
  36 | 
  37 |     await page.goto('/login');
  38 |     await page.locator('.login-form-input[type="email"]').fill('nope@animeregistry.dev');
  39 |     await page.locator('.login-form-input[type="password"]').fill('WrongPass1!');
  40 |     await page.locator('.login-btn-primary').click();
  41 | 
  42 |     await expect(page.locator('.login-message-error')).toContainText('Invalid email or password');
  43 |     await expect(page).not.toHaveURL(/\/$/);
  44 |   });
  45 | 
  46 |   test('login blocks empty fields with a validation message', async ({ page }) => {
  47 |     await installMocks(page);
  48 |     await page.goto('/login');
  49 |     await page.locator('.login-btn-primary').click();
  50 | 
  51 |     // Native `required` validation blocks the submit before the app's JS runs
  52 |     const msg = await page.locator('.login-form-input[type="email"]').evaluate((el) => el.validationMessage);
  53 |     expect(msg).not.toBe('');
  54 |     await expect(page).toHaveURL(/\/login/);
  55 |   });
  56 | 
  57 |   test('registration enforces password policy', async ({ page }) => {
  58 |     await installMocks(page);
  59 |     await page.goto('/register');
  60 | 
  61 |     // 7 chars passes the native minLength={6} but fails the app's 8-char rule
  62 |     await page.locator('#email').fill('new@animeregistry.dev');
  63 |     await page.locator('#password').fill('short1!');
  64 |     await page.locator('#confirmPassword').fill('short1!');
  65 |     await page.locator('.btn-primary').click();
  66 | 
  67 |     await expect(page.locator('.message-error')).toContainText('at least 8 characters');
  68 |   });
  69 | 
  70 |   test('registration with valid input redirects home', async ({ page }) => {
  71 |     await installMocks(page, { user: TEST_USER });
  72 | 
  73 |     await page.route(`${API}/auth/register`, (route) =>
  74 |       route.fulfill({
  75 |         status: 201,
  76 |         json: {
  77 |           success: true,
  78 |           message: 'Registration successful',
  79 |           data: { user: TEST_USER, accessToken: 'tok', refreshToken: 'ref' },
  80 |         },
  81 |       })
  82 |     );
  83 | 
  84 |     await page.goto('/register');
  85 |     await page.locator('#email').fill('new@animeregistry.dev');
  86 |     await page.locator('#password').fill('Password1!');
  87 |     await page.locator('#confirmPassword').fill('Password1!');
> 88 |     await page.locator('.btn-primary').click();
     |                                        ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  89 | 
  90 |     await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
  91 |   });
  92 | });
  93 | 
```