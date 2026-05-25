# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Releases are managed by [release-please](https://github.com/googleapis/release-please)
from [Conventional Commits](https://www.conventionalcommits.org/).

## [1.1.0](https://github.com/voila-voila-dev/paste.voila.dev/compare/v1.0.0...v1.1.0) (2026-05-25)


### Features

* add Rybbit analytics script ([e62fe08](https://github.com/voila-voila-dev/paste.voila.dev/commit/e62fe0832ac814e0ff0d6c3f7e82570fdd52e411))
* **api:** public create + read paste endpoints with rate limiting ([00159c3](https://github.com/voila-voila-dev/paste.voila.dev/commit/00159c3c96c2192c0545c9c95f840e6412ede284))
* discreet GitHub source link in the home header ([49ff7dd](https://github.com/voila-voila-dev/paste.voila.dev/commit/49ff7dde8854f818940211603cec44430fae72e6))
* hosted MCP server at /mcp (create_paste, get_paste) ([f9ec8d6](https://github.com/voila-voila-dev/paste.voila.dev/commit/f9ec8d6747da73692e23aa5e71c6a3a7f15821f6))
* multi-file pastes with tree view and internal links ([bed26b2](https://github.com/voila-voila-dev/paste.voila.dev/commit/bed26b2a7e5c7bca6586bcb6bdd49d83c918c36f))
* raise MAX_FILES 50 → 200 ([b43667d](https://github.com/voila-voila-dev/paste.voila.dev/commit/b43667ddd87f83a0cc50b8633d2f2e2b9d07058f))
* remember pastes you view or open, not just ones you create ([c4ec5ce](https://github.com/voila-voila-dev/paste.voila.dev/commit/c4ec5ce453f72ac42ffa79f4c6ebf1f040f10c86))
* SEO meta, sitemap, robots, OG card ([ce69314](https://github.com/voila-voila-dev/paste.voila.dev/commit/ce69314e4080c0325f3d70578e153edc14bc5c80))


### Bug fixes

* **ci:** pin Node 22 so wrangler-action skips npm fallback ([ef8c175](https://github.com/voila-voila-dev/paste.voila.dev/commit/ef8c1759e6501235233edea8921cdf423e633ad4))

## [Unreleased]

## [1.0.0] - 2026-05-20

### Added
- Markdown pastebin with UUIDv7 ids and base62 edit tokens in URL fragment.
- TanStack Start app deployed to Cloudflare Workers with a custom domain.
- Cloudflare D1 storage via Drizzle ORM.
- Live split-pane editor with rendered preview and `highlight.js` syntax highlighting.
- Optional paste title, auto-detected from the first `# h1` in the first 10 lines of content.
- Public / unlisted visibility — unlisted pastes are reachable only by direct URL.
- Public listing of the 50 most recent public pastes on the home page.
- `localStorage`-backed "Your pastes" list with a discreet notice about local persistence.
- Share section on edit page with read-only URL and edit URL + copy buttons.
- Delete-paste flow with edit-token check and two-step confirmation.
- Raw markdown endpoint (`GET /{id}/raw`) and download endpoint (`GET /{id}/download`).
- Per-IP rate limiting at the edge: 5 creates/min and 20 updates/min, via Cloudflare's
  `ratelimit` binding.
- TanStack Form for both create and edit forms.
- shadcn-style UI primitives built on `@base-ui-components/react` (not Radix).
- Tailwind v4 with `@tailwindcss/typography`, Geist Mono site-wide.
- GitHub Actions: preview deploys on pull requests, production deploys on push to `main`.
- Monorepo layout: `domain` (pure types), `architecture` (Drizzle repositories),
  `ui` (component library), `apps/paste.voila.dev` (TanStack Start app).

[Unreleased]: https://github.com/voila-voila-dev/paste.voila.dev/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/voila-voila-dev/paste.voila.dev/releases/tag/v1.0.0
