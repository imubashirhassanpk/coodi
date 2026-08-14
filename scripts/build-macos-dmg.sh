#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Coodi macOS builds must run on macOS. Current host: $(uname -s)" >&2
  exit 1
fi

host_arch="$(uname -m)"
target="${1:-}"
if [[ -z "$target" ]]; then
  case "$host_arch" in
    arm64|aarch64) target="aarch64-apple-darwin" ;;
    x86_64|amd64) target="x86_64-apple-darwin" ;;
    *)
      echo "Unsupported macOS host architecture: $host_arch" >&2
      exit 1
      ;;
  esac
fi

case "$target" in
  aarch64-apple-darwin|x86_64-apple-darwin) ;;
  *)
    echo "Target must be aarch64-apple-darwin or x86_64-apple-darwin: $target" >&2
    exit 1
    ;;
esac

if [[ ! -x "./node_modules/.bin/tauri" ]]; then
  echo "Tauri CLI is missing. Run pnpm install first." >&2
  exit 1
fi

# Without APPLE_CODE_SIGNING=true, this prepares an unsigned local build.
node scripts/release/packaging/macos/prepare-signing.mjs

exec ./node_modules/.bin/tauri build \
  --target "$target" \
  --bundles app,dmg
