# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: home.spec.js >> Home page >> search returns results from the backend
- Location: e2e\home.spec.js:252:7

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('.anime-grid .anime-card-premium')
Expected: 2
Received: 6
Timeout:  10000ms

Call log:
  - Expect "toHaveCount" with timeout 10000ms
  - waiting for locator('.anime-grid .anime-card-premium')
    21 × locator resolved to 6 elements
       - unexpected value "6"

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - link "Home" [ref=e4] [cursor=pointer]:
      - /url: /home
    - link [ref=e11] [cursor=pointer]:
      - /url: /list
    - link [ref=e14] [cursor=pointer]:
      - /url: /advance
    - link [ref=e19] [cursor=pointer]:
      - /url: /ai
    - link [ref=e25] [cursor=pointer]:
      - /url: /login
  - generic [ref=e31]:
    - banner [ref=e32]:
      - link [ref=e34] [cursor=pointer]:
        - /url: /
        - img "AnimeRegistry" [ref=e35]
      - generic [ref=e37]:
        - img "Search"
        - textbox "Search anime..." [active] [ref=e38]: Naruto
      - link [ref=e40] [cursor=pointer]:
        - /url: /login
        - button "Get Started" [ref=e41]
    - main [ref=e43]:
      - generic [ref=e45]:
        - generic [ref=e46] [cursor=pointer]:
          - generic [ref=e47]:
            - generic [ref=e48]:
              - generic [ref=e49]: ★
              - generic [ref=e50]: "8.2"
            - button "Add to Favorites" [ref=e51]
          - img "Naruto" [ref=e55]
          - generic [ref=e57]:
            - generic [ref=e58]:
              - generic [ref=e59]: ○
              - text: TV
            - heading "Naruto" [level=2] [ref=e60]
            - generic [ref=e61]:
              - generic [ref=e65]:
                - generic [ref=e66]: RELEASED
                - generic [ref=e67]: "2026"
              - generic [ref=e72]:
                - generic [ref=e73]: EPISODES
                - generic [ref=e74]: 24 Ep
              - generic [ref=e79]:
                - generic [ref=e80]: GENRE
                - generic [ref=e81]: Action, Adventure
          - generic [ref=e82]:
            - button "Watching" [ref=e83]
            - button "Completed" [ref=e87]
            - button "Plan to Watch" [ref=e90]
            - button "Share" [ref=e94]
        - generic [ref=e101] [cursor=pointer]:
          - generic [ref=e102]:
            - generic [ref=e103]:
              - generic [ref=e104]: ★
              - generic [ref=e105]: "8.2"
            - button "Add to Favorites" [ref=e106]
          - img "One Piece" [ref=e110]
          - generic [ref=e112]:
            - generic [ref=e113]:
              - generic [ref=e114]: ○
              - text: TV
            - heading "One Piece" [level=2] [ref=e115]
            - generic [ref=e116]:
              - generic [ref=e120]:
                - generic [ref=e121]: RELEASED
                - generic [ref=e122]: "2026"
              - generic [ref=e127]:
                - generic [ref=e128]: EPISODES
                - generic [ref=e129]: 24 Ep
              - generic [ref=e134]:
                - generic [ref=e135]: GENRE
                - generic [ref=e136]: Action, Adventure
          - generic [ref=e137]:
            - button "Watching" [ref=e138]
            - button "Completed" [ref=e142]
            - button "Plan to Watch" [ref=e145]
            - button "Share" [ref=e149]
        - generic [ref=e156] [cursor=pointer]:
          - generic [ref=e157]:
            - generic [ref=e158]:
              - generic [ref=e159]: ★
              - generic [ref=e160]: "8.2"
            - button "Add to Favorites" [ref=e161]
          - img "Bleach" [ref=e165]
          - generic [ref=e167]:
            - generic [ref=e168]:
              - generic [ref=e169]: ○
              - text: TV
            - heading "Bleach" [level=2] [ref=e170]
            - generic [ref=e171]:
              - generic [ref=e175]:
                - generic [ref=e176]: RELEASED
                - generic [ref=e177]: "2026"
              - generic [ref=e182]:
                - generic [ref=e183]: EPISODES
                - generic [ref=e184]: 24 Ep
              - generic [ref=e189]:
                - generic [ref=e190]: GENRE
                - generic [ref=e191]: Action, Adventure
          - generic [ref=e192]:
            - button "Watching" [ref=e193]
            - button "Completed" [ref=e197]
            - button "Plan to Watch" [ref=e200]
            - button "Share" [ref=e204]
        - generic [ref=e211] [cursor=pointer]:
          - generic [ref=e212]:
            - generic [ref=e213]:
              - generic [ref=e214]: ★
              - generic [ref=e215]: "8.2"
            - button "Add to Favorites" [ref=e216]
          - img "Attack on Titan" [ref=e220]
          - generic [ref=e222]:
            - generic [ref=e223]:
              - generic [ref=e224]: ○
              - text: TV
            - heading "Attack on Titan" [level=2] [ref=e225]
            - generic [ref=e226]:
              - generic [ref=e230]:
                - generic [ref=e231]: RELEASED
                - generic [ref=e232]: "2026"
              - generic [ref=e237]:
                - generic [ref=e238]: EPISODES
                - generic [ref=e239]: 24 Ep
              - generic [ref=e244]:
                - generic [ref=e245]: GENRE
                - generic [ref=e246]: Action, Adventure
          - generic [ref=e247]:
            - button "Watching" [ref=e248]
            - button "Completed" [ref=e252]
            - button "Plan to Watch" [ref=e255]
            - button "Share" [ref=e259]
        - generic [ref=e266] [cursor=pointer]:
          - generic [ref=e267]:
            - generic [ref=e268]:
              - generic [ref=e269]: ★
              - generic [ref=e270]: "8.2"
            - button "Add to Favorites" [ref=e271]
          - img "Demon Slayer" [ref=e275]
          - generic [ref=e277]:
            - generic [ref=e278]:
              - generic [ref=e279]: ○
              - text: TV
            - heading "Demon Slayer" [level=2] [ref=e280]
            - generic [ref=e281]:
              - generic [ref=e285]:
                - generic [ref=e286]: RELEASED
                - generic [ref=e287]: "2026"
              - generic [ref=e292]:
                - generic [ref=e293]: EPISODES
                - generic [ref=e294]: 24 Ep
              - generic [ref=e299]:
                - generic [ref=e300]: GENRE
                - generic [ref=e301]: Action, Adventure
          - generic [ref=e302]:
            - button "Watching" [ref=e303]
            - button "Completed" [ref=e307]
            - button "Plan to Watch" [ref=e310]
            - button "Share" [ref=e314]
        - generic [ref=e321] [cursor=pointer]:
          - generic [ref=e322]:
            - generic [ref=e323]:
              - generic [ref=e324]: ★
              - generic [ref=e325]: "8.2"
            - button "Add to Favorites" [ref=e326]
          - img "Jujutsu Kaisen" [ref=e330]
          - generic [ref=e332]:
            - generic [ref=e333]:
              - generic [ref=e334]: ○
              - text: TV
            - heading "Jujutsu Kaisen" [level=2] [ref=e335]
            - generic [ref=e336]:
              - generic [ref=e340]:
                - generic [ref=e341]: RELEASED
                - generic [ref=e342]: "2026"
              - generic [ref=e347]:
                - generic [ref=e348]: EPISODES
                - generic [ref=e349]: 24 Ep
              - generic [ref=e354]:
                - generic [ref=e355]: GENRE
                - generic [ref=e356]: Action, Adventure
          - generic [ref=e357]:
            - button "Watching" [ref=e358]
            - button "Completed" [ref=e362]
            - button "Plan to Watch" [ref=e365]
            - button "Share" [ref=e369]
    - region "About AnimeRegistry" [ref=e376]:
      - generic [ref=e377]:
        - heading "Create Your Free Anime List & Track Every Series You Watch" [level=1] [ref=e378]
        - paragraph [ref=e379]: Keeping track of everything you watch should be easy. AnimeRegistry is a free anime list and anime tracker that puts your entire anime library in one place — the shows you are watching, the series you have finished, and everything you have planned for later.
        - heading "What Is AnimeRegistry?" [level=2] [ref=e380]
        - paragraph [ref=e381]: AnimeRegistry is a modern anime list platform built for fans who want more control over their anime collection. Instead of juggling notes and bookmarks, you get a clean anime database where every series has detailed information — episodes, genres, studios, scores and trailers — ready to add to your list in one tap.
        - paragraph [ref=e382]: Whether you are binging a seasonal favorite or slowly working through a decades-old classic, your anime library follows you. Sign in on any device and pick up exactly where you left off.
        - heading "Build an Anime List That Fits How You Watch" [level=2] [ref=e383]
        - paragraph [ref=e384]: "Your anime list is the heart of the app. Every show you add lands in a status that makes sense for how you actually watch:"
        - list [ref=e385]:
          - listitem [ref=e386]:
            - strong [ref=e387]: Watching
            - text: — shows you are currently on
          - listitem [ref=e388]:
            - strong [ref=e389]: Completed
            - text: — series you have finished
          - listitem [ref=e390]:
            - strong [ref=e391]: Planned
            - text: — everything queued up for later
          - listitem [ref=e392]:
            - strong [ref=e393]: Dropped
            - text: — shows that were not for you
        - paragraph [ref=e394]: Because it doubles as an anime progress tracker, you can log the exact episode you are on for every series — even ongoing shows that air weekly. No more guessing where you stopped.
        - heading "Rate Anime, Write Reviews & Build a Watchlist You Trust" [level=2] [ref=e395]
        - paragraph [ref=e396]: AnimeRegistry treats your opinion as part of the catalog. Rate every anime you watch on a ten-point scale and write anime reviews to remember what you thought. Your ratings and history feed into personal anime statistics, so you can see your watch time, genre habits and completion streaks at a glance.
        - heading "Discover Something New" [level=2] [ref=e397]
        - paragraph [ref=e398]:
          - text: Browse trending shows, top-rated series, upcoming releases and the most-watched titles on this page, or open the
          - link "advanced anime search" [ref=e399] [cursor=pointer]:
            - /url: /advance
          - text: to filter the catalog by genre, status and more.
        - heading "Meet OtakuAI, Your Anime Companion" [level=2] [ref=e400]
        - paragraph [ref=e401]: Finding your next favorite show is easier with a little help. OtakuAI is a built-in anime assistant that chats with you like a friend — ask for recommendations, find the top shows of the season, or just geek out about a series you love.
        - paragraph [ref=e402]: When you are signed in, OtakuAI greets you by name and suggests personalized picks, hidden gems and binge-worthy titles based on your watchlist and history. Every conversation is saved, so you can pick up right where you left off.
        - paragraph [ref=e403]:
          - link "Chat with OtakuAI" [ref=e404] [cursor=pointer]:
            - /url: /ai
          - text: and discover your next anime.
        - heading "Earn Achievements & Badges Along the Way" [level=2] [ref=e405]
        - paragraph [ref=e406]:
          - text: Watching anime is more fun with goals. AnimeRegistry turns your progress into anime achievements and badges — finish a long-running series, log your first hundred episodes, and watch them unlock on your
          - link "profile" [ref=e407] [cursor=pointer]:
            - /url: /profile
          - text: . It is a lightweight gamification layer that makes even a quiet binge feel rewarding.
        - heading "Sync Your Anime Library Across Every Device" [level=2] [ref=e408]
        - paragraph [ref=e409]: Your anime collection lives in the cloud, so your list, progress and ratings stay in sync. Start an episode on your laptop and finish it on your phone — your anime library updates instantly. The mobile experience includes a bottom navigation bar tuned for one-handed use.
        - heading "Frequently Asked Questions" [level=2] [ref=e410]
        - generic [ref=e411]:
          - group [ref=e412]:
            - generic "What is AnimeRegistry? +" [ref=e413] [cursor=pointer]
          - group [ref=e414]:
            - generic "How do I create an anime list? +" [ref=e415] [cursor=pointer]
          - group [ref=e416]:
            - generic "Is AnimeRegistry free? +" [ref=e417] [cursor=pointer]
          - group [ref=e418]:
            - generic "Can I import MyAnimeList? +" [ref=e419] [cursor=pointer]
          - group [ref=e420]:
            - generic "How do anime badges work? +" [ref=e421] [cursor=pointer]
          - group [ref=e422]:
            - generic "Can I track episode progress? +" [ref=e423] [cursor=pointer]
          - group [ref=e424]:
            - generic "Does AnimeRegistry work on mobile? +" [ref=e425] [cursor=pointer]
          - group [ref=e426]:
            - generic "Is my anime list synchronized? +" [ref=e427] [cursor=pointer]
        - generic [ref=e428]:
          - heading "Start Your Anime List Today" [level=2] [ref=e429]
          - paragraph [ref=e430]: Create a free account, add your first anime and start earning badges. Your whole anime journey, in one place.
          - link "Create Your Free Anime List" [ref=e431] [cursor=pointer]:
            - /url: /register
            - text: Create Your Free Anime List
            - generic [ref=e432]: ›
    - contentinfo "Site footer" [ref=e433]:
      - generic [ref=e434]:
        - generic [ref=e435]:
          - link [ref=e436] [cursor=pointer]:
            - /url: /home
            - img "AnimeRegistry" [ref=e437]
          - paragraph [ref=e438]: Your ultimate anime companion.Track, discover, obsess.
        - navigation "Footer navigation" [ref=e439]:
          - generic [ref=e440]:
            - heading "Explore" [level=2] [ref=e441]
            - list [ref=e442]:
              - listitem [ref=e443]:
                - link "Home" [ref=e444] [cursor=pointer]:
                  - /url: /home
              - listitem [ref=e445]:
                - link "Search" [ref=e446] [cursor=pointer]:
                  - /url: /advance
              - listitem [ref=e447]:
                - link "AI Chat" [ref=e448] [cursor=pointer]:
                  - /url: /ai
              - listitem [ref=e449]:
                - link "My List" [ref=e450] [cursor=pointer]:
                  - /url: /list
          - generic [ref=e451]:
            - heading "Account" [level=2] [ref=e452]
            - list [ref=e453]:
              - listitem [ref=e454]:
                - link "Profile" [ref=e455] [cursor=pointer]:
                  - /url: /profile
              - listitem [ref=e456]:
                - link "Settings" [ref=e457] [cursor=pointer]:
                  - /url: /settings
              - listitem [ref=e458]:
                - link "Login" [ref=e459] [cursor=pointer]:
                  - /url: /login
              - listitem [ref=e460]:
                - link "Register" [ref=e461] [cursor=pointer]:
                  - /url: /register
          - generic [ref=e462]:
            - heading "Company" [level=2] [ref=e463]
            - list [ref=e464]:
              - listitem [ref=e465]:
                - link "About Us" [ref=e466] [cursor=pointer]:
                  - /url: /about
              - listitem [ref=e467]:
                - link "Contact Us" [ref=e468] [cursor=pointer]:
                  - /url: /contact
          - generic [ref=e469]:
            - heading "Legal" [level=2] [ref=e470]
            - list [ref=e471]:
              - listitem [ref=e472]:
                - link "Privacy Policy" [ref=e473] [cursor=pointer]:
                  - /url: /privacy
              - listitem [ref=e474]:
                - link "Terms & Conditions" [ref=e475] [cursor=pointer]:
                  - /url: /terms
              - listitem [ref=e476]:
                - link "Cookie Policy" [ref=e477] [cursor=pointer]:
                  - /url: /cookie-policy
      - generic [ref=e478]:
        - generic [ref=e479]: © 2026 AnimeRegistry. All rights reserved.
        - generic [ref=e480]:
          - text: Made with
          - generic "love" [ref=e481]: ♥
          - text: for anime fans
```

# Test source

```ts
  160 |     expect(Object.keys(map)).toHaveLength(0);
  161 |     await page.locator('.anime-card-premium').first().waitFor({ state: 'visible' });
  162 |     await expect(page.locator('.footer-action-item.active')).toHaveCount(0);
  163 |   });
  164 | });
  165 | 
  166 | test.describe('Global list-status memory', () => {
  167 | 
  168 |   test('statuses are per-user and never shared between accounts', async ({ page }) => {
  169 |     const listA = {
  170 |       watching: [{ title: 'Naruto', animeId: '1', malId: '101' }],
  171 |       completed: [], planned: [], dropped: [], favorites: [],
  172 |     };
  173 |     await installMocks(page, {
  174 |       list: listA,
  175 |       user: { _id: 'user-A', id: 'user-A', email: 'a@x.com', name: 'Alice' },
  176 |     });
  177 |     await page.goto('/');
  178 |     await page.evaluate(() => {
  179 |       localStorage.setItem('user', JSON.stringify({ id: 'user-A', email: 'a@x.com', name: 'Alice' }));
  180 |       localStorage.setItem('user_id', 'user-A');
  181 |       localStorage.setItem('accessToken', 'tok-A');
  182 |       localStorage.setItem('refreshToken', 'ref-A');
  183 |     });
  184 |     await page.goto('/');
  185 |     await waitForHome(page);
  186 | 
  187 |     const narutoCard = page.locator('.anime-card-premium').filter({ hasText: 'Naruto' }).first();
  188 |     await expect(narutoCard.locator('.footer-action-item.active.watching')).toBeVisible();
  189 | 
  190 |     // Switch to Bob: logout clears the cached map (covered by the logout test),
  191 |     // so a fresh session for Bob starts with an empty map + his own backend list.
  192 |     await page.evaluate(() => {
  193 |       localStorage.removeItem('list_status_map');
  194 |       localStorage.setItem('user', JSON.stringify({ id: 'user-B', email: 'b@x.com', name: 'Bob' }));
  195 |       localStorage.setItem('user_id', 'user-B');
  196 |       localStorage.setItem('accessToken', 'tok-B');
  197 |       localStorage.setItem('refreshToken', 'ref-B');
  198 |     });
  199 |     await installMocks(page, {
  200 |       list: EMPTY_LIST,
  201 |       user: { _id: 'user-B', id: 'user-B', email: 'b@x.com', name: 'Bob' },
  202 |     });
  203 |     await page.goto('/');
  204 |     await waitForHome(page);
  205 | 
  206 |     await expect(narutoCard.locator('.footer-action-item.active')).toHaveCount(0);
  207 |   });
  208 | });
  209 | 
  210 | test.describe('Home page', () => {
  211 |   test('renders anime sections with cards', async ({ page }) => {
  212 |     await installMocks(page);
  213 |     await page.goto('/');
  214 |     await waitForHome(page);
  215 | 
  216 |     await expect(page.locator('.anime-carousel-section')).toHaveCount(6);
  217 |     await expect(page.locator('.anime-card-premium').first()).toBeVisible();
  218 |   });
  219 | 
  220 |   test('opens the detail modal when a card is clicked', async ({ page }) => {
  221 |     await installMocks(page);
  222 |     await page.goto('/');
  223 |     await waitForHome(page);
  224 | 
  225 |     await page.locator('.anime-card-premium').first().click();
  226 |     await expect(page.locator('.modal-overlay')).toBeVisible();
  227 |   });
  228 | 
  229 |   test('opening the detail modal does not refetch the user list', async ({ page }) => {
  230 |     const list = {
  231 |       watching: [{ title: 'Naruto', animeId: '1', malId: '101' }],
  232 |       completed: [], planned: [], dropped: [], favorites: [],
  233 |     };
  234 |     await seedSession(page);
  235 |     await installMocks(page, { list, user: { _id: 'user-123', email: 't@x.com', name: 'Tester' } });
  236 |     await page.goto('/');
  237 |     await waitForHome(page);
  238 | 
  239 |     // Count list GETs after the initial load (the duplicate fetch was removed)
  240 |     let listGets = 0;
  241 |     page.on('request', (req) => {
  242 |       if (req.method() === 'GET' && /\/api\/list\//.test(req.url())) listGets++;
  243 |     });
  244 | 
  245 |     await page.locator('.anime-card-premium').first().click();
  246 |     await expect(page.locator('.modal-overlay')).toBeVisible();
  247 |     await page.waitForTimeout(500);
  248 | 
  249 |     expect(listGets).toBe(0);
  250 |   });
  251 | 
  252 |   test('search returns results from the backend', async ({ page }) => {
  253 |     await installMocks(page, { searchResults: [ANIME.naruto, ANIME.onePiece] });
  254 |     await page.goto('/');
  255 |     await waitForHome(page);
  256 | 
  257 |     await page.locator('.input[type="text"]').fill('Naruto');
  258 | 
  259 |     await expect(page.locator('.anime-grid')).toBeVisible({ timeout: 10_000 });
> 260 |     await expect(page.locator('.anime-grid .anime-card-premium')).toHaveCount(2);
      |                                                                   ^ Error: expect(locator).toHaveCount(expected) failed
  261 |   });
  262 | 
  263 |   test('logged-out user sees Get Started CTA instead of profile', async ({ page }) => {
  264 |     await installMocks(page);
  265 |     await page.goto('/');
  266 |     await waitForHome(page);
  267 | 
  268 |     await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible();
  269 |   });
  270 | });
  271 | 
  272 | test.describe('Responsive layout', () => {
  273 |   test('bottom nav and cards render on a mobile viewport', async ({ page }) => {
  274 |     await page.setViewportSize({ width: 390, height: 844 });
  275 |     await installMocks(page);
  276 |     await page.goto('/');
  277 |     await waitForHome(page);
  278 | 
  279 |     await expect(page.locator('.anime-card-premium').first()).toBeVisible();
  280 |     await expect(page.locator('.bottom-button-bar')).toBeVisible();
  281 |     await expect(page.locator('.nav-item')).toHaveCount(5);
  282 |   });
  283 | });
  284 | 
```