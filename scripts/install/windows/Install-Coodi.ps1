<#
.SYNOPSIS
  Installs the Coodi Windows x64 NSIS installer from PowerShell.

.DESCRIPTION
  This script runs the bundled Coodi NSIS installer, optionally in silent mode,
  and reports the installed executable path. Run it from an elevated PowerShell
  session only when your organization's installation policy requires it.

.EXAMPLE
  .\Install-Coodi.ps1

.EXAMPLE
  .\Install-Coodi.ps1 -InstallerPath .\Coodi_0.11.0_x64-setup.exe -Quiet
#>

[CmdletBinding()]
param(
  [string]$InstallerPath = (Join-Path $PSScriptRoot "Coodi_0.11.0_x64-setup.exe"),
  [switch]$Quiet
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$resolvedInstaller = Resolve-Path -LiteralPath $InstallerPath -ErrorAction Stop
if ([System.IO.Path]::GetExtension($resolvedInstaller.Path) -ne ".exe") {
  throw "The installer must be an .exe file: $($resolvedInstaller.Path)"
}

$arguments = @()
if ($Quiet) {
  # NSIS uses an uppercase /S for unattended installation.
  $arguments += "/S"
}

Write-Host "Installing Coodi from $($resolvedInstaller.Path) ..."
$process = Start-Process -FilePath $resolvedInstaller.Path -ArgumentList $arguments -Wait -PassThru
if ($process.ExitCode -ne 0) {
  throw "Coodi installer exited with code $($process.ExitCode)."
}

$pathsToCheck = @(
  (Join-Path $env:LOCALAPPDATA "Programs\Coodi\Coodi.exe"),
  (Join-Path ${env:ProgramFiles} "Coodi\Coodi.exe"),
  (Join-Path ${env:ProgramFiles(x86)} "Coodi\Coodi.exe")
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

if ($pathsToCheck.Count -gt 0) {
  Write-Host "Coodi installed successfully: $($pathsToCheck[0])"
} else {
  Write-Host "Coodi installer completed successfully. Use the Start menu to open Coodi."
}
