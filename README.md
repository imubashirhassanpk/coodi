<div align="center">
  <img src="public/logo.png" alt="Coodi" width="120">
  <h1>Coodi</h1>
  <p>A free, local-first AI code builder built with Tauri, Rust, and React.</p>
  <img src="public/screenshot.png" alt="Coodi Screenshot" width="800">
</div>

## About Coodi

**Coodi** is an independently maintained open-source desktop code builder. It is released under the **GNU Affero General Public License v3 or later**, with the applicable copyright notices and attribution requirements preserved.

Coodi is deliberately **account-free, subscription-free, and BYOK-only**. It does not require registration, login, billing, a hosted account, or a Pro upgrade. Users connect providers with their own API keys, while local providers such as Ollama can run without a cloud key. Provider credentials are stored through the desktop secure-storage implementation using the OS keychain when available.

> Coodi sends AI requests directly to the provider selected by the user. It does not route requests through an upstream paid hosted-AI service, and cloud settings synchronization is disabled.

## Included capabilities

| Capability | Coodi implementation |
| --- | --- |
| Code workspace | Editor, syntax highlighting, LSP support, Vim keybindings, file explorer, search, terminal, Git, GitHub, remote, WSL, Docker, debugger, database, and extension infrastructure. |
| AI providers | OpenAI, Anthropic, Gemini, Grok, DeepSeek, Mistral, Qwen, OpenRouter free models, NVIDIA NIM models, custom OpenAI-compatible endpoints, and Ollama. |
| OpenRouter | The model catalog is filtered to models marked free by the provider catalog, including `:free` models and zero-priced entries. |
| NVIDIA NIM | The authenticated NVIDIA catalog is loaded from NVIDIA's OpenAI-compatible endpoint with the user's own NVIDIA API key. |
| Secure API keys | Provider keys are stored using the desktop keychain integration and are never sent to a Coodi account service. |
| Branding | Product name, desktop identifier, menus, documentation links, footer attribution, extension metadata, and update URLs use the Coodi identity. |

## Using Coodi

Launch Coodi, open **Settings → Agent**, select a provider, and add your own API key. Then choose a model from the provider catalog. OpenRouter users can create a key at [OpenRouter Keys](https://openrouter.ai/keys), and NVIDIA users can create a key at [NVIDIA Build](https://build.nvidia.com/settings/api-keys). For local inference, run Ollama and select the Ollama provider.

The application works without any account. Projects, editor state, settings, and provider credentials remain local to the device unless the selected provider receives a request made with the user's key.

## Development

This Coodi refresh uses **pnpm** for JavaScript dependencies. The source archive intentionally excludes generated dependencies and build output.

```bash
pnpm install --ignore-scripts --config.block-exotic-subdeps=false
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vp lint .
./node_modules/.bin/vp build
cargo check --workspace
cargo fmt --all -- --check
```

For Linux packaging, use the scripts under `scripts/release/`. For Windows x64 packaging, use `scripts/build-windows-nsis.sh` or `scripts/build-windows-gnu-nsis.sh`. The terminal-oriented Windows installer is `scripts/install/windows/Install-Coodi.ps1`; see [docs/INSTALL_WINDOWS.md](docs/INSTALL_WINDOWS.md).

For macOS packaging, run on a native macOS host. The build wrapper automatically selects Apple Silicon or Intel based on the host:

```bash
pnpm run build:mac
```

You can also select an architecture explicitly:

```bash
pnpm run build:mac:apple-silicon  # aarch64-apple-darwin
pnpm run build:mac:intel          # x86_64-apple-darwin
```

These commands produce `.app` and `.dmg` bundles under `src-tauri/target/<target>/release/bundle/`. Local builds are unsigned unless Apple signing environment variables are configured. See [docs/INSTALL_MACOS.md](docs/INSTALL_MACOS.md) for prerequisites, signing, and installation details. Automated Windows and macOS builds are documented in [docs/CI_INSTALLERS.md](docs/CI_INSTALLERS.md).

## Local installer builds for Windows and macOS

Use this section when building from the checked-out Coodi source on your own machine. These are **local builds**, not GitHub Actions commands. Run the platform-specific build command on the corresponding operating system, and do not commit certificates, API keys, Apple credentials, or signing tokens.

### Shared preparation

From the Coodi repository root, install dependencies and perform the quick TypeScript check before creating an installer:

```bash
git status
corepack enable
pnpm install --ignore-scripts --config.block-exotic-subdeps=false
pnpm run typecheck
```

The working tree should be clean before a release build. On Windows, use a PowerShell terminal. On macOS, use Terminal or another native macOS shell.

### Windows x64 NSIS `.exe`

Build the Windows installer on Windows 10/11 with Node.js 22+, Rust, and the Visual Studio **Desktop development with C++** workload installed:

```powershell
pnpm exec tauri build --bundles nsis
Get-ChildItem .\src-tauri\target\release\bundle\nsis\*.exe
```

The expected artifact is named similar to:

```text
src-tauri\target\release\bundle\nsis\Coodi_<version>_x64-setup.exe
```

Before sharing the installer, record its checksum and test it on a Windows machine. The installer should show the Coodi C-mark, open **Settings → Agent**, and allow scrolling to provider, model, and API-key controls.

```powershell
$installer = Get-ChildItem .\src-tauri\target\release\bundle\nsis\*.exe | Select-Object -First 1
Get-FileHash $installer.FullName -Algorithm SHA256
Start-Process $installer.FullName
```

For a source-hosted cross-compilation setup that already has the required toolchain, use `scripts/build-windows-nsis.sh`. The GNU fallback is `scripts/build-windows-gnu-nsis.sh`. The normal Windows-native command above is the recommended local workflow. See [docs/INSTALL_WINDOWS.md](docs/INSTALL_WINDOWS.md) for installation and quiet-install details.

### macOS `.dmg`

Build macOS artifacts on a **native macOS** host. The standard command detects Apple Silicon or Intel automatically and produces both a `.app` and a `.dmg`:

```bash
pnpm run build:mac
```

To choose an architecture explicitly, use one of these commands:

```bash
pnpm run build:mac:apple-silicon  # aarch64-apple-darwin
pnpm run build:mac:intel          # x86_64-apple-darwin
```

Expected outputs are under the selected target directory:

```text
src-tauri/target/aarch64-apple-darwin/release/coodi.app
src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/Coodi_<version>_aarch64.dmg
src-tauri/target/x86_64-apple-darwin/release/coodi.app
src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/Coodi_<version>_x86_64.dmg
```

Test the application before distribution:

```bash
open src-tauri/target/aarch64-apple-darwin/release/coodi.app
codesign --verify --deep --strict --verbose=2 \
  src-tauri/target/aarch64-apple-darwin/release/coodi.app
```

Local macOS builds are unsigned by default. For a signed build, provide a valid Apple Developer ID identity through environment variables; never commit those credentials:

```bash
export APPLE_CODE_SIGNING=true
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAMID)"
pnpm run build:mac:apple-silicon
```

For public distribution, notarize signed builds before shipping them. A Linux or Windows machine cannot produce a trustworthy native macOS `.app` or `.dmg`; use a Mac or a macOS CI runner. See [docs/INSTALL_MACOS.md](docs/INSTALL_MACOS.md) for full signing and notarization guidance.

### Copy-paste prompts for Cursor, Claude, Grok, or another coding assistant

Give the assistant one prompt at a time from the Coodi repository root. These prompts intentionally keep release publication separate from local installer creation.

#### Windows NSIS build prompt

```text
You are working in the Coodi repository on a Windows machine. Build a local x64 NSIS .exe installer only; do not publish a GitHub release, do not create a git tag, and do not change Coodi branding, identifiers, icons, or version numbers unless I explicitly ask.

First, inspect git status and stop if unrelated local changes would be overwritten. Then run:
1. corepack enable
2. pnpm install --ignore-scripts --config.block-exotic-subdeps=false
3. pnpm run typecheck
4. pnpm exec tauri build --bundles nsis

After the build, locate src-tauri\target\release\bundle\nsis\Coodi_*_x64-setup.exe, calculate its SHA-256 with Get-FileHash, and report the exact installer path, size, checksum, and any errors. Do not upload, delete, rename, or publish the artifact.

For manual smoke testing, remind me to install the .exe and verify that Coodi opens with the C-mark icon and that Settings → Agent scrolls to the Provider, Model, and API Keys controls.
```

#### macOS DMG build prompt

```text
You are working in the Coodi repository on a native macOS machine. Build a local Coodi .app and .dmg for the current Mac only; do not publish a GitHub release, do not create a git tag, and do not change Coodi branding, identifiers, icons, or version numbers unless I explicitly ask.

First, inspect git status and stop if unrelated local changes would be overwritten. Then run:
1. corepack enable
2. pnpm install --ignore-scripts --config.block-exotic-subdeps=false
3. pnpm run typecheck
4. pnpm run build:mac

After the build, locate the .app and .dmg under src-tauri/target/<target>/release/. Open the .app once, run codesign --verify --deep --strict --verbose=2 on it, and report the exact artifact paths, architecture, file sizes, and any errors. Do not sign, notarize, upload, delete, rename, or publish anything unless I explicitly provide the required Apple credentials and ask for that action.

For manual smoke testing, remind me to verify the C-mark icon, app launch, and Settings → Agent scrolling to the Provider, Model, and API Keys controls.
```

## Project website and attribution

Visit [Coodi by Mubashir Hassan](https://www.mubashirhassan.com/coodi) for project information, documentation, support details, and release information. The desktop footer displays **“Coodi by Mubashir Hassan”** and links to the same page.

## License

Coodi is licensed under [AGPL-3.0-or-later](LICENSE). When distributing binaries or modified versions, provide the corresponding source and preserve the upstream license notices in accordance with the AGPL.
