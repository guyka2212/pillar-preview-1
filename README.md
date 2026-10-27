# Pillar Diagnostic Agent

A Hebrew (RTL) voice AI diagnostic agent prototype for Pillar Tech. It behaves like a great
consultative salesperson **who doesn't sell**: it prepares from the client's materials, listens,
asks one question at a time, and works with the business owner to find up to three real
opportunities to create value with AI agents.

Everything runs in the visitor's browser. There is no backend and no API key.

**Live site:** https://guyka2212.github.io/pillar-preview-1/

## Run locally

```bash
npm install && npm run dev
```

Other scripts: `npm test` (Vitest), `npm run build` (type-check + production build), `npm run preview`.

## Deployment

`.github/workflows/deploy.yml` builds, tests and publishes `dist/` to GitHub Pages on every push
to `main`. Pages must be set to **Settings → Pages → Source: GitHub Actions**.
Vite `base` is `/pillar-preview-1/` and routing uses a hash router so refreshes never 404.

## Known limitations

See `TODO.md` for the full list. Highlights are kept here as the build progresses.
