# PowerStudios Customer Portal

Customer portal of PowerStudios, a fictional solar panel installer in Hasselt, Belgium.
This app is the target of the Agentic SDLC demo and is deployed to GitHub Pages.

Built with Vite and vanilla JavaScript (no runtime dependencies). Own PowerStudios brand: deep navy,
solar amber, Plus Jakarta Sans. Pages (hash routing in `src/main.js`): Home (`#/`, with `#/solutions` and
`#/projects` anchors), Quote calculator (`#/quote`) and Login (`#/login`). Marketing copy lives in
`src/content.js`, icons in `src/icons.js`, the hero image in `public/media/` (WebP with JPG fallback).

```bash
cd app
npm ci
npm run dev        # local dev server
npm test           # unit tests (Vitest)
npm run test:e2e   # smoke tests (Playwright, needs: npx playwright install chromium)
npm run build      # production build in dist/
```

The release number in the footer comes from `version` in `package.json`.

## Demo start state
The portal ships with seeded defects that agents fix live: the quote button reads "Requets quote", VAT is
calculated at 12% under a "VAT (21%)" label, the session expires right after login, and there is no print
button. `scripts/reset-demo.sh` (or `.ps1`) restores them from `scripts/seed/` in a new commit.
