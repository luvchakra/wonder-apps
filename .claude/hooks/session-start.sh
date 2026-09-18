#!/bin/bash
# SessionStart hook: prepare the workspace so tests and linters run immediately.
#
# The repository is polyglot-by-intent ("wonder-apps"), so instead of hardcoding
# one toolchain this detects whichever dependency manifests are present and
# installs only those. It is a no-op until real project files land.
set -euo pipefail

# Only do install work in Claude Code on the web; local checkouts manage themselves.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"

log() { echo "[session-start] $*"; }

installed_any=false

# --- Node -------------------------------------------------------------------
# Prefer whichever package manager the repo actually pins, and prefer `install`
# over `ci` so the cached container layer can be reused across sessions.
if [ -f package.json ]; then
  installed_any=true
  if [ -f pnpm-lock.yaml ] && command -v pnpm >/dev/null 2>&1; then
    log "pnpm install"
    pnpm install
  elif [ -f bun.lockb ] || [ -f bun.lock ]; then
    log "bun install"
    bun install
  elif [ -f yarn.lock ] && command -v yarn >/dev/null 2>&1; then
    log "yarn install"
    yarn install --non-interactive
  else
    log "npm install"
    npm install --no-fund --no-audit
  fi
fi

# --- Python -----------------------------------------------------------------
if [ -f pyproject.toml ]; then
  installed_any=true
  if [ -f uv.lock ] || grep -qs '^\[tool\.uv' pyproject.toml; then
    log "uv sync"
    uv sync
  elif grep -qs '^\[tool\.poetry' pyproject.toml; then
    log "poetry install"
    poetry install --no-interaction
  else
    log "pip install -e ."
    pip3 install --quiet -e . || pip3 install --quiet .
  fi
elif [ -f requirements.txt ]; then
  installed_any=true
  log "pip install -r requirements.txt"
  pip3 install --quiet -r requirements.txt
fi

# --- Go / Rust / Ruby -------------------------------------------------------
if [ -f go.mod ]; then
  installed_any=true
  log "go mod download"
  go mod download
fi

if [ -f Cargo.toml ]; then
  installed_any=true
  log "cargo fetch"
  cargo fetch
fi

if [ -f Gemfile ]; then
  installed_any=true
  log "bundle install"
  bundle install
fi

if [ "$installed_any" = false ]; then
  log "no dependency manifest found yet - nothing to install"
fi

log "ready"
