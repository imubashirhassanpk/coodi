# Automated Windows and macOS Installer Builds

Coodi includes `.github/workflows/build-installers.yml`, which builds the following artifacts on GitHub-hosted runners:

| Platform | Runner | Target | Output |
| --- | --- | --- | --- |
| Windows x64 | `windows-latest` | `x86_64-pc-windows-msvc` | NSIS `.exe` installer |
| macOS Apple Silicon | `macos-14` | `aarch64-apple-darwin` | `.app` and `.dmg` |
| macOS Intel | `macos-13` | `x86_64-apple-darwin` | `.app` and `.dmg` |

## Triggers

The workflow runs for pushes to `main`, pushes of version tags matching `v*`, and manual `workflow_dispatch` runs. Every build uploads a 30-day workflow artifact named `coodi-windows-x64`, `coodi-macos-aarch64`, or `coodi-macos-x86_64`.

When a version tag such as `v0.11.0` is pushed, the `publish-release` job downloads all platform artifacts and attaches them to a GitHub Release automatically. The workflow requires the repository to be `mubashirhassanpk/coodi` and does not publish release assets from forks.

## Manual execution

From the repository page, open **Actions → Build Coodi Installers → Run workflow**. The workflow will build all three platform targets and expose the artifacts on the completed workflow run.

To publish a release, create and push a version tag:

```bash
git tag v0.11.0
git push origin v0.11.0
```

## Optional Windows signing

Unsigned Windows installers are produced when signing secrets are absent. To enable Authenticode signing, add these repository or environment secrets:

| Secret | Value |
| --- | --- |
| `WINDOWS_CERTIFICATE_BASE64` | Base64-encoded `.pfx` certificate |
| `WINDOWS_CERTIFICATE_PASSWORD` | Password for the `.pfx` certificate |
| `WINDOWS_TIMESTAMP_URL` | Optional RFC 3161 timestamp URL; the workflow defaults to `http://time.certum.pl/` |

The certificate is imported into the temporary GitHub runner certificate store and is not committed to the repository.

## Optional macOS signing and notarization

Unsigned `.app` and `.dmg` bundles are produced when Apple signing secrets are absent. To enable application signing, add:

| Secret | Value |
| --- | --- |
| `APPLE_CERTIFICATE_BASE64` | Base64-encoded Developer ID Application `.p12` certificate |
| `APPLE_CERTIFICATE_PASSWORD` | Password for the `.p12` certificate |
| `APPLE_SIGNING_IDENTITY` | Exact keychain identity, for example `Developer ID Application: Company Name (TEAMID)` |

For notarization credentials, also configure `APPLE_ID`, `APPLE_PASSWORD`, and `APPLE_TEAM_ID`. The current workflow passes those values to Tauri for the build; notarization and certificate management should be extended only after the organization has confirmed its Apple distribution policy.

Never store certificates, private keys, or passwords in the repository. Use GitHub Actions encrypted secrets or environment-level secrets with the narrowest required scope.

## Local equivalence

The CI build commands correspond to the local commands below:

```powershell
pnpm exec tauri build --target x86_64-pc-windows-msvc --bundles nsis
```

```bash
pnpm run build:mac:apple-silicon
pnpm run build:mac:intel
```

The workflow uses Rust nightly and `pnpm install --ignore-scripts --config.block-exotic-subdeps=false`, matching the project’s current build requirements.
