# Testing OtakuShelf — list-status feature

Everything was tested with **Playwright (E2E)** plus manual checks. This doc tells you how to run the tests, what each one proves, and how to verify the feature by hand.

---

## 1. Run the tests

```powershell
cd src\Frontend
npx playwright test --reporter=list
```

The dev server auto-starts on port 5173 — no need to start it yourself.

| Command | What it does |
|---|---|
| `npx playwright test --reporter=list` | Runs all E2E tests headlessly |
| `npm run test:e2e:headed` | Runs tests in a visible browser window |
| `npm run test:e2e:install` | Installs Chromium (first time only) |
| `npx playwright show-report` | Opens a full HTML report of the last run |

> Current expected result: **14 passing / 0 failing** (as of the last run — all E2E tests are green).

---

## 2. What a green run proves

These are the core behaviors the E2E tests verify:

- **Cards are colored for anime already in your list** — a listed anime shows a colored icon on its card (watching = green, completed = blue, planned = yellow). Anime not in any list shows no color.
- **Toggling is instant** — click a status on a card and the icon colors immediately, no refresh.
- **Toggling calls the backend** — a `POST /api/list/<userId>` request is fired with the chosen status.
- **Memory is global** — set a status on one page, navigate away and back, it's still there.
- **Auth & navigation flows** — login, register, logout, bottom nav, and the 404 page all work.

---

## 3. The previously failing tests (now fixed)

These were test bugs (wrong selectors / timing) plus one real app bug. All are now fixed and the suite is green.

| Spec | Test | Root cause | Fix |
|---|---|---|---|
| `home.spec.js` | Toggle POST count | Request listener attached *after* the click already fired | Attach listener before the click; also assert toggle-off removes the status |
| `home.spec.js` | Cross-page memory | `page.goto` (full reload) wiped saved statuses — a **real app bug** in `ListStatusContext.jsx` | Fixed the app: reset now runs only on real logout, not on mount |
| `home.spec.js` | Logged-out CTA | 3 links match `a[href="/login"]` (strict-mode violation) | Scoped locator to `getByRole('link', { name: 'Get Started' })` |
| `auth.spec.js` | Login empty-fields | Native `required` blocks submit before the app's message renders | Assert native `validationMessage` + stays on `/login` |
| `auth.spec.js` | Register password policy | `minLength={6}` blocked 'short' (5 chars) natively | Use 7-char password (`short1!`) to reach the app's 8-char rule |
| `auth.spec.js` | Valid registration | Transient (passed on re-run) | None needed |

---

## 4. Manual sanity check (no tests)

1. Start the backend: `npm run dev` in the `workers` folder (API on `http://localhost:8787`).
2. Start the frontend: `npm run dev` in `src/Frontend` (opens at `http://localhost:5173`).
3. Log in and add some anime to your list (or import from MAL).
4. On a card, click Watching / Completed / Planned — the icon colors instantly.
5. Open the same anime in search, the list page, and the detail modal — same color everywhere.
6. **Check the reload fix**: add a status, hit F5, and confirm it's still remembered. (Before the fix, a reload wiped it.)

---

## 5. Full test checklist

Legend: ✅ automated (Playwright) · 👆 manual (browser)

### A. List-status core feature

| # | What to test | How | Pass = |
|---|---|---|---|
| 1 | Colored icons for listed anime | ✅ `npx playwright test home.spec.js` | Naruto=green, One Piece=blue, Bleach=yellow, AoT=none |
| 2 | Match by AniList id | 👆 open a home/search card for an anime added via the app | Icon colored |
| 3 | Match by MAL id | 👆 view an anime imported from MAL (the original bug) | Icon colored |
| 4 | Match by normalized title | 👆 same as above, title-based match | Icon colored |
| 5 | Instant toggle | ✅ + 👆 click an inactive status | Icon colors without refresh |
| 6 | Correct POST payload | 👆 DevTools → Network → click status | `POST /api/list/<userId>` with a `list` field |
| 7 | Toggle off removes status | 👆 click the active status again | Icon uncolors + remove request sent |
| 8 | Status on every page | 👆 home, search, list page, modal | Same color everywhere |
| 9 | Survives full reload | ✅ (cross-page test) + 👆 F5 | Status still shown after reload |
| 10 | Cleared on logout only | 👆 log out | Icons clear; refresh while logged out → still empty |
| 11 | Per-user separation | 👆 log in as another user | Their statuses are independent |
| 12 | No duplicate fetch on modal | 👆 open modal | No extra/unneeded `/api/list` request |
| 13 | New status not overwritten | 👆 add a status, reload | Status survives backend list sync |

### B. E2E suite health

| # | What to test | How | Pass = |
|---|---|---|---|
| 14 | Existing tests stay green | ✅ `npx playwright test --reporter=list` | No new failures |
| 15 | Full suite green | ✅ last run: **14/14 passed** | All specs pass |

### C. App regression (nothing broke)

| # | What to test | How | Pass = |
|---|---|---|---|
| 16 | Auth flows | ✅ E2E (auth.spec.js) + 👆 wrong password → error; correct → home; register weak → policy msg; strong → home; logout | All flows work |
| 17 | Home page | ✅ E2E (sections + modal + search covered) + 👆 load `/` | 6 sections + trailer hero render |
| 18 | Search | ✅ E2E + 👆 type in search bar; open `/advance` | Backend results + filters work |
| 19 | Detail modal | ✅ E2E + 👆 click a card → modal opens/closes | Icon shows inside modal for listed anime |
| 20 | List page | 👆 `/list`, switch all 4 tabs | Add from home → appears in the right tab |
| 21 | Navigation | ✅ E2E (navigation.spec.js) + 👆 unknown URL | Pages change; 404 page shows |
| 22 | Profile & settings | 👆 `/profile`, `/settings` | No errors |
| 23 | Mobile layout | 👆 shrink window / device toolbar | Bottom nav + cards still render correctly |

### D. Live site (production)

| # | What to test | How | Pass = |
|---|---|---|---|
| 24 | MAL fix live | 👆 https://otakushelf.pages.dev → log in | MAL-imported anime show colored icons |
| 25 | Status persistence live | 👆 add status, refresh, log out/in | Still remembered |

---

## 6. Fixes applied (reference)

All 14 tests are green. The changes that made them pass:

1. **Toggle POST count** (`home.spec.js`) — moved the `page.on('request')` listener *before* the click, and added assertions that a second click toggles the status off (`map['id:4']` becomes undefined).
2. **Cross-page memory** (`home.spec.js`) — the underlying app bug was fixed in `src/Frontend/components/ListStatusContext.jsx`: the reset effect now clears the map only on a real logout (`hadUserRef` tracks whether a user was present), not on initial mount when `userId` is briefly `undefined`. This preserves statuses across full page reloads.
3. **Logged-out CTA** (`home.spec.js`) — scoped to `page.getByRole('link', { name: 'Get Started' })` to avoid the strict-mode match on the nav link and footer link.
4. **Login empty-fields** (`auth.spec.js`) — the app relies on native `required`; the test now asserts the email input's `validationMessage` is non-empty and the user stays on `/login`.
5. **Register password policy** (`auth.spec.js`) — uses `short1!` (7 chars) so it passes the native `minLength={6}` and reaches the app's "at least 8 characters" message.
6. **Valid registration** (`auth.spec.js`) — passed on re-run; no change needed.

---

## 7. After a run

- Failure details: `src/Frontend/test-results/` (each failing test has an `error-context.md` snapshot).
- Full report: `npx playwright show-report`.
