# paste.voila.dev

Markdown pastebin. No auth. UUIDv7 ids. Edit token in URL fragment.

## Stack
- Bun workspaces monorepo
- TanStack Start (front + back) deployed to Cloudflare Workers
- Drizzle + Cloudflare D1 (SQLite)
- shadcn UI components built on Base UI primitives (`@base-ui-components/react`) — not Radix
- Tailwind v4 with `@tailwindcss/typography`
- Biome for lint/format

## Layout
```
apps/
  paste.voila.dev      # TanStack Start app — wrangler config + routes
packages/
  domain               # Paste entity, repository interface, errors
  architecture         # Drizzle schema + DrizzlePasteRepository (D1)
  ui                   # shared UI primitives (shadcn over Base UI)
```

## Commands
```
bun run dev                    # start app on :3069 with local D1 (miniflare)
bun run db:generate            # regenerate Drizzle SQL migration from schema
bun run db:migrate:local       # apply migrations to local .wrangler D1
bun run db:migrate:remote      # apply migrations to remote D1
bun run deploy                 # build + wrangler deploy
```

## Production setup
- D1: `paste-voila` (id `118a3c92-053c-4b81-887d-cecec2ef9cb2`), bound as `DB`
- Custom domain: `paste.voila.dev`
- CI/CD: GitHub Actions — preview on PR, deploy on push to `main`

## Domain
- `id` is UUIDv7 (sortable by creation time)
- `edit_token` is 32-char base62; lives in URL fragment so it never hits server logs
- pastes never expire
- max paste size: 1 MB
