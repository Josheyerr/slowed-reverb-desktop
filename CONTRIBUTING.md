# Contributing

Thanks for wanting to help out.

## Before you start

- Open an issue first for bigger changes so we’re not duplicating work
- Keep PRs focused — one change per PR when you can
- Match the style of the surrounding code

## Setup

```bash
npm install
npm run dev
```

Useful scripts:

- `npm run typecheck` — TypeScript check
- `npm run dist` — local Windows installer (doesn’t upload)
- `npm run publish` — only when releasing (needs `CONFIRM_PUBLISH=1`)

## Pull requests

1. Fork and create a branch
2. Make your change
3. Run typecheck if you touched TS
4. Open a PR with a short description of what changed and why

## Reporting bugs

Use the bug report issue template. Include your Windows version, app version, and steps to reproduce if you can.
