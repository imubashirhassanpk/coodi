#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

eval "$(cargo xwin env --target x86_64-pc-windows-msvc)"
exec ./node_modules/.bin/tauri build --target x86_64-pc-windows-msvc --bundles nsis
