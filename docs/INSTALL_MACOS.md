# Coodi macOS Build and Installation Guide

Coodi supports macOS 10.15 or later and can be built for both Apple Silicon (`aarch64-apple-darwin`) and Intel (`x86_64-apple-darwin`). Builds must run on a native macOS host because Apple SDKs, code-signing tools, notarization, and DMG packaging are not available on Linux.

## Prerequisites

Install Xcode or the Xcode Command Line Tools, Homebrew, Node.js 22 or later, pnpm, Rust nightly, and Git. For signed or notarized distribution, also prepare an Apple Developer account, a Developer ID Application certificate, an App Store Connect API or Apple ID credential, and the appropriate team identifier.

Verify the basic toolchain from Terminal:

```bash
xcode-select --install  # only if the tools are not already installed
node --version          # Node.js 22 or later
pnpm --version
rustc --version
cargo --version
git --version
```

The repository pins the Rust channel to nightly through `rust-toolchain.toml`. If Rustup has not installed it yet, run:

```bash
rustup toolchain install nightly
rustup default nightly
```

## Install dependencies

From the Coodi source root:

```bash
cd /path/to/coodi
corepack enable
pnpm install --ignore-scripts --config.block-exotic-subdeps=false
```

The source archive excludes generated dependencies and build output. The `--ignore-scripts` flag is recommended for this fork because some inherited maintenance scripts use Bun-specific runtime APIs; it does not prevent the Tauri production build from running its configured frontend build hook.

## Build for the current Mac

The simplest command detects the current host architecture and produces both an `.app` bundle and a `.dmg` installer:

```bash
pnpm run build:mac
```

The wrapper invokes the Tauri CLI with the appropriate target and `--bundles app,dmg`.

## Build Apple Silicon explicitly

For Apple Silicon Macs, run:

```bash
pnpm run build:mac:apple-silicon
```

Equivalent direct command:

```bash
./node_modules/.bin/tauri build \
  --target aarch64-apple-darwin \
  --bundles app,dmg
```

Expected output paths:

```text
src-tauri/target/aarch64-apple-darwin/release/coodi.app
src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/Coodi_0.11.0_aarch64.dmg
```

## Build Intel explicitly

For Intel Macs, run:

```bash
pnpm run build:mac:intel
```

Equivalent direct command:

```bash
./node_modules/.bin/tauri build \
  --target x86_64-apple-darwin \
  --bundles app,dmg
```

Expected output paths:

```text
src-tauri/target/x86_64-apple-darwin/release/coodi.app
src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/Coodi_0.11.0_x86_64.dmg
```

The exact generated filename can vary slightly with the installed Tauri CLI version, so inspect the relevant `bundle/dmg` directory if the filename differs.

## Test the `.app` before distributing it

Open the application directly from Terminal:

```bash
open src-tauri/target/aarch64-apple-darwin/release/coodi.app
```

For Intel, replace the target directory with `x86_64-apple-darwin`. You can also launch the binary directly for diagnostics:

```bash
src-tauri/target/aarch64-apple-darwin/release/coodi.app/Contents/MacOS/coodi
```

Check the application metadata and architecture:

```bash
/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' \
  src-tauri/target/aarch64-apple-darwin/release/coodi.app/Contents/Info.plist
file src-tauri/target/aarch64-apple-darwin/release/coodi.app/Contents/MacOS/coodi
```

The expected bundle identifier is `com.code.coodi`.

## Unsigned local builds

By default, `pnpm run build:mac` creates an unsigned local bundle. To open an unsigned app, macOS may require Control-clicking the application in Finder and choosing **Open**, or allowing it under **System Settings → Privacy & Security**. Do not bypass security checks for binaries whose source or checksum you have not reviewed.

## Apple code signing

For a signed release, provide an Apple Developer ID Application identity and enable the repository’s signing preparation helper:

```bash
export APPLE_CODE_SIGNING=true
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAMID)"
pnpm run build:mac:apple-silicon
```

The helper updates the Tauri configuration for the current build. The signing identity must already exist in the local keychain and be usable by `codesign`.

Verify the result:

```bash
codesign --verify --deep --strict --verbose=2 \
  src-tauri/target/aarch64-apple-darwin/release/coodi.app
codesign -dv --verbose=4 \
  src-tauri/target/aarch64-apple-darwin/release/coodi.app 2>&1 | head -40
```

For distribution outside the developer machine, notarize the signed app or DMG with Apple’s `notarytool`, then staple the notarization ticket. Credentials and signing certificates must never be committed to the repository.

## Important limitation

A Linux machine cannot produce a trustworthy native macOS release artifact because Apple’s SDK, signing chain, notarization service, and native packaging environment are required. Use a physical Mac or a macOS CI runner for the final `.app` and `.dmg` release. The repository’s release workflow already defines separate targets for Apple Silicon and Intel macOS builds.

## AI provider setup

After installation, open **Settings → Agent**, select a provider, and add the user’s own API key. Coodi remains account-free and subscription-free. Provider credentials are managed locally through the desktop secure-storage integration.
