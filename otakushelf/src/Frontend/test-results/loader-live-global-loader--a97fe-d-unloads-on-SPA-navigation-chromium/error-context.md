# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: loader-live.spec.js >> global loader: restarts and unloads on SPA navigation
- Location: e2e\loader-live.spec.js:35:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - generic:
    - generic: 🎬
    - generic: 🍥
    - generic: 🎭
  - generic [ref=f1e4]:
    - link "← Home" [ref=f1e5] [cursor=pointer]:
      - /url: /
      - generic [ref=f1e6]: ←
      - text: Home
    - generic [ref=f1e7]:
      - heading "Welcome Back" [level=1] [ref=f1e8]
      - paragraph [ref=f1e9]: Sign in to your AnimeRegistry account
    - generic [ref=f1e10]:
      - generic [ref=f1e12]:
        - generic:
          - img "Email"
        - textbox "Enter your email" [ref=f1e13]
      - generic [ref=f1e14]:
        - generic [ref=f1e15]:
          - generic:
            - img "Password"
          - textbox "Enter your password" [ref=f1e16]
        - link "Forgot password?" [ref=f1e18] [cursor=pointer]:
          - /url: /forgot-password
      - button "Login →" [ref=f1e20] [cursor=pointer]:
        - generic [ref=f1e21]: Login
        - generic [ref=f1e22]: →
    - generic [ref=f1e23]: or continue with
    - button "Sign in with Google" [ref=f1e25] [cursor=pointer]
    - paragraph [ref=f1e33]:
      - text: New to AnimeRegistry?
      - link "Join Now →" [ref=f1e34] [cursor=pointer]:
        - /url: /register
        - generic [ref=f1e35]: Join Now
        - generic [ref=f1e36]: →
```

# Test source

```ts
  1  | ﻿const { test, expect } = require('@playwright/test');
  2  | 
  3  | const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
  4  | const loaderSelector = '.page-loader';
  5  | 
  6  | // Waits for the loader to be visible (or already visible) within the timeout
  7  | async function waitForLoaderVisible(page, timeout = 5000) {
  8  |   const t0 = Date.now();
  9  |   while (Date.now() - t0 < timeout) {
  10 |     if (await page.evaluate((sel) => !!document.querySelector(sel), loaderSelector)) return true;
  11 |     await page.waitForTimeout(20);
  12 |   }
  13 |   return false;
  14 | }
  15 | 
  16 | async function waitForLoaderGone(page, timeout = 15000) {
  17 |   const t0 = Date.now();
  18 |   while (Date.now() - t0 < timeout) {
  19 |     if (await page.evaluate((sel) => !document.querySelector(sel), loaderSelector)) return true;
  20 |     await page.waitForTimeout(50);
  21 |   }
  22 |   return false;
  23 | }
  24 | 
  25 | test('global loader: shows on initial load, then unloads', async ({ page }) => {
  26 |   await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  27 | 
  28 |   // Loader must be present shortly after first paint (curtain animation)
  29 |   expect(await waitForLoaderVisible(page, 3000)).toBe(true);
  30 | 
  31 |   // Once home data is ready the loader exits and is removed from the DOM
  32 |   expect(await waitForLoaderGone(page, 15000)).toBe(true);
  33 | });
  34 | 
  35 | test('global loader: restarts and unloads on SPA navigation', async ({ page }) => {
  36 |   // Preload the login chunk so navigation does not block on a network fetch
  37 |   await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  38 |   await waitForLoaderGone(page, 15000);
  39 | 
  40 |   await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  41 |   await waitForLoaderGone(page, 15000);
  42 | 
  43 |   // SPA-nav to a route (login) via a real link click
  44 |   await page.getByRole('link', { name: /^login$/i }).first().click({ timeout: 15000 });
  45 | 
  46 |   // The loader must re-appear as a result of the navigation
> 47 |   expect(await waitForLoaderVisible(page, 3000)).toBe(true);
     |                                                  ^ Error: expect(received).toBe(expected) // Object.is equality
  48 |   expect(page.url()).toMatch(/\/login$/);
  49 | 
  50 |   // And then unload once the login page is ready
  51 |   expect(await waitForLoaderGone(page, 15000)).toBe(true);
  52 | });
  53 | 
```