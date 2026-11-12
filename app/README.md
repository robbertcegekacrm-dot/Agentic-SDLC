# PowerStudios Customer Portal

Customer portal of PowerStudios, a fictional solar panel installer in Hasselt, Belgium.
This app is the target of the Agentic SDLC demo and is deployed to GitHub Pages.

Built with Vite and vanilla JavaScript.

```bash
cd app
npm ci
npm run dev        # local dev server
npm test           # unit tests (Vitest)
npm run test:e2e   # smoke tests (Playwright, needs: npx playwright install chromium)
npm run build      # production build in dist/
```

The release number in the footer comes from `version` in `package.json`.
