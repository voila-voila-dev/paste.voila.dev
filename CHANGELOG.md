# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Releases are managed by [release-please](https://github.com/googleapis/release-please)
from [Conventional Commits](https://www.conventionalcommits.org/).

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
