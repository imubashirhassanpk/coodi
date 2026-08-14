# Install Coodi on Windows x64

Coodi is a desktop code editor based on the latest upstream source tree and configured for self-managed AI providers. It requires a 64-bit edition of Windows 10 or later.

## Desktop installer

Run the generated NSIS installer, named similar to `Coodi_0.11.0_x64-setup.exe`, from Windows Explorer. Follow the installer prompts, then launch **Coodi** from the Start menu.

## Terminal installer

Place `Install-Coodi.ps1` in the same directory as the Coodi NSIS installer. Open PowerShell in that directory and run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\Install-Coodi.ps1 -InstallerPath .\Coodi_0.11.0_x64-setup.exe
```

For an unattended deployment, use the NSIS silent flag through the same script:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\Install-Coodi.ps1 -InstallerPath .\Coodi_0.11.0_x64-setup.exe -Quiet
```

> The `Bypass` execution policy is scoped to the current PowerShell process only. Review the installer checksum and source before deployment in managed environments.

## Source build

The source tree is configured for pnpm. From PowerShell with Node.js 22 or later, Rust, and the Visual Studio C++ desktop workload installed:

```powershell
corepack enable
pnpm install --ignore-scripts --config.block-exotic-subdeps=false
pnpm exec tauri build --bundles nsis
```

The generated installer will be in `src-tauri\target\release\bundle\nsis`.

## AI provider setup

After installation, open **Settings → Agent**. Add the user's own OpenAI, OpenRouter, NVIDIA NIM, or other provider API key. OpenRouter selects provider-reported free models; NVIDIA NIM retrieves models available to the authenticated user. Coodi does not require an account, subscription, or hosted sign-in, and it does not route requests through an upstream paid hosted-AI service.
