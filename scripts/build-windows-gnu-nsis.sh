#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER="x86_64-w64-mingw32-gcc"
export CC_x86_64_pc_windows_gnu="x86_64-w64-mingw32-gcc"
export CXX_x86_64_pc_windows_gnu="x86_64-w64-mingw32-g++"
export AR_x86_64_pc_windows_gnu="x86_64-w64-mingw32-ar"

exec ./node_modules/.bin/tauri build --target x86_64-pc-windows-gnu --bundles nsis
