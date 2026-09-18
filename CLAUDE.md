# wonder-apps

## Status

This repository is a scaffold-in-waiting: at present it contains only this file,
the README, and the Claude Code configuration under `.claude/`. No application
code, dependency manifest, or test suite exists yet.

If you are the first agent or contributor to add real code here, update this
file in the same change — replace this Status section with the actual project
layout, and fill in the Commands section below with the real commands.

## Commands

There is no build, lint, or test command yet. Once a toolchain is chosen,
record the exact commands here, for example:

| Task      | Command |
| --------- | ------- |
| Install   | _tbd_   |
| Dev       | _tbd_   |
| Lint      | _tbd_   |
| Test      | _tbd_   |
| Typecheck | _tbd_   |

Do not guess these commands — read them from `package.json` scripts (or the
equivalent manifest) and verify by running them before documenting them.

## Session startup

`.claude/hooks/session-start.sh` runs at the start of every Claude Code on the
web session. It detects dependency manifests and installs only what is present:

- `package.json` → pnpm / bun / yarn / npm, chosen by which lockfile exists
- `pyproject.toml` or `requirements.txt` → uv, Poetry, or pip
- `go.mod`, `Cargo.toml`, `Gemfile` → `go mod download`, `cargo fetch`, `bundle install`

It is a deliberate no-op while the repository is empty, so adding a manifest is
enough to get dependencies installed automatically — no hook edit required.
The hook exits immediately outside the web environment (`CLAUDE_CODE_REMOTE`),
so local checkouts are unaffected.

## Conventions

- Match the surrounding code's existing style; this file is not a license to
  impose a house style on code that already has one.
- Keep the Commands table above accurate. A stale command here is worse than
  no command, because it gets trusted.
