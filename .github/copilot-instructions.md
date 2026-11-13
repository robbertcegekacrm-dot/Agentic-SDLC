# Copilot instructions

This repository runs the Agentic SDLC demo. The PowerStudios Customer Portal in `/app` is the only code you work on.

## Scope
- Only change files under `/app`.
- Never touch `/powerplatform`, `/docs`, `/Skills`, `/scripts`, `/agents`, `/.github` or `/app/scripts`.
- Make the smallest change that solves the issue. No refactoring, no new dependencies unless the issue needs them.

## Every change
- Add or update a test for every fix or feature:
  - logic in `app/src/*.js` → Vitest test next to it (`app/src/*.test.js`)
  - visible UI behaviour → Playwright smoke test in `app/tests/`
- Bump the patch version in `app/package.json` and `app/package-lock.json` (for example 1.0.6 → 1.0.7).
  Run `npm version patch --no-git-tag-version` in `app`.
- Put the story reference `STY-xxxx` from the issue title in the PR title, for example
  `STY-1042: Fix quote button label`.

## Run the tests
```bash
cd app
npm ci
npm test           # Vitest unit tests
npm run test:e2e   # Playwright smoke tests (builds and serves the app on port 4173)
```

## Stack
Vite + vanilla JavaScript, no framework. Pages use hash routing in `app/src/main.js`.
Quote calculation lives in `app/src/quote.js`, the login session in `app/src/session.js`.
Marketing copy lives in `app/src/content.js`, icons in `app/src/icons.js`, styles in `app/src/style.css`.
Styling follows the PowerStudios brand: deep navy, solar amber accent, white, Plus Jakarta Sans, rounded cards.
Reuse the existing CSS classes (`.btn`, `.btn-primary`, `.card`, `.panel`) for new UI.
