use crate::app_runtime::AppHandle;
use std::fs;
#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
use tauri::command;

// Platform-specific CLI paths
#[cfg(unix)]
fn get_cli_script_path() -> Result<std::path::PathBuf, String> {
   let home = std::env::var("HOME").map_err(|_| "Failed to get home directory".to_string())?;
   Ok(std::path::PathBuf::from(home)
      .join(".local")
      .join("bin")
      .join("coodi"))
}

#[cfg(windows)]
fn get_cli_script_path() -> Result<std::path::PathBuf, String> {
   let home = std::env::var("USERPROFILE")
      .map_err(|_| "Failed to get user profile directory".to_string())?;
   Ok(std::path::PathBuf::from(home)
      .join(".coodi")
      .join("bin")
      .join("coodi.cmd"))
}

#[cfg(windows)]
fn get_cli_powershell_path() -> Result<std::path::PathBuf, String> {
   let cli_path = get_cli_script_path()?;
   Ok(cli_path.with_extension("ps1"))
}

/// On Linux, check if an existing CLI script contains macOS-specific commands (`open -a`).
/// Returns `false` if the script has wrong-platform content.
#[cfg(all(unix, not(target_os = "macos")))]
fn validate_cli_script(path: &std::path::Path) -> bool {
   match fs::read_to_string(path) {
      Ok(content) => !content.contains("open -a"),
      Err(_) => false,
   }
}

#[command]
pub fn check_cli_installed() -> Result<bool, String> {
   let cli_path = get_cli_script_path()?;

   if !cli_path.exists() {
      return Ok(false);
   }

   #[cfg(all(unix, not(target_os = "macos")))]
   if !validate_cli_script(&cli_path) {
      return Ok(false);
   }

   Ok(true)
}

/// Shell script body shared by macOS install_cli_command and get_cli_install_command.
/// Resolves file/folder arguments to absolute paths and opens them via deep-link URLs.
fn app_identifier_suffix(app: &AppHandle) -> Option<&'static str> {
   match app.config().identifier.as_str() {
      "com.code.coodi.preview" => Some("preview"),
      "com.code.www.mubashirhassan.com" => Some("dev"),
      _ => None,
   }
}

fn deep_link_scheme(app: &AppHandle) -> &'static str {
   match app_identifier_suffix(app) {
      Some("preview") => "coodi-preview",
      Some("dev") => "coodi-dev",
      _ => "coodi",
   }
}

const CLI_HELP_TEXT: &str = r#"Coodi CLI

Usage:
  coodi [paths...]
  coodi open <paths...>
  coodi web <url>
  coodi terminal [command...]
  coodi remote <connection-id> [name]

Examples:
  coodi index.html
  coodi src/main.rs:120
  coodi open README.md docs/architecture.md
  coodi web https://www.mubashirhassan.com/coodi/docs
  coodi terminal npm test
  coodi remote conn-123 My Server
"#;

#[cfg(unix)]
fn unix_cli_script(open_url_body: &str, launch_app_block: &str, deep_link_scheme: &str) -> String {
   let help = CLI_HELP_TEXT.replace('\'', r"'\''");

   format!(
      r#"#!/bin/bash
# Coodi CLI launcher

print_help() {{
    cat <<'EOF'
{help}
EOF
}}

urlencode() {{
    local value="$1"
    local encoded=""
    local i c
    for ((i=0; i<${{#value}}; i++)); do
        c="${{value:$i:1}}"
        case "$c" in
            [a-zA-Z0-9._~/-]) encoded+="$c" ;;
            *) encoded+=$(printf '%%%02X' "'$c") ;;
        esac
    done
    printf '%s' "$encoded"
}}

open_url() {{
{open_url_body}
}}

open_path_arg() {{
    local arg="$1"
    local file="$arg"
    local line=""

    if [[ "$arg" =~ ^(.+):([0-9]+)$ ]]; then
        file="${{BASH_REMATCH[1]}}"
        line="${{BASH_REMATCH[2]}}"
    fi

    local abs=""
    local type_param=""
    if [ -d "$file" ]; then
        abs="$(cd "$file" && pwd -P)"
        type_param="&type=directory"
    elif [ -f "$file" ]; then
        local dir
        dir="$(cd "$(dirname "$file")" && pwd -P)"
        abs="$dir/$(basename "$file")"
    else
        echo "coodi: $file: No such file or directory" >&2
        return
    fi

    local url="{deep_link_scheme}://open?path=$(urlencode "$abs")"
    [ -n "$line" ] && [ "$line" -gt 0 ] 2>/dev/null && url+="&line=${{line}}"
    [ -n "$type_param" ] && url+="$type_param"
    open_url "$url"
}}

open_web() {{
    local url_arg="$1"
    if [ -z "$url_arg" ]; then
        echo "coodi: web requires a URL" >&2
        exit 1
    fi

    open_url "{deep_link_scheme}://open?type=web&url=$(urlencode "$url_arg")"
}}

open_terminal() {{
    local command_arg="$1"
    local cwd
    cwd="$(pwd -P)"
    local url="{deep_link_scheme}://open?type=terminal&cwd=$(urlencode "$cwd")"
    [ -n "$command_arg" ] && url+="&command=$(urlencode "$command_arg")"
    open_url "$url"
}}

open_remote() {{
    local connection_id="$1"
    local connection_name="$2"

    if [ -z "$connection_id" ]; then
        echo "coodi: remote requires a connection id" >&2
        exit 1
    fi

    local url="{deep_link_scheme}://open?type=remote&connectionId=$(urlencode "$connection_id")"
    [ -n "$connection_name" ] && url+="&name=$(urlencode "$connection_name")"
    open_url "$url"
}}

if [ $# -eq 0 ]; then
{launch_app_block}
    exit 0
fi

case "$1" in
    help|-h|--help)
        print_help
        exit 0
        ;;
    open)
        shift
        [ $# -eq 0 ] && {{
            echo "coodi: open requires at least one path" >&2
            exit 1
        }}
        ;;
    web)
        shift
        open_web "$1"
        exit 0
        ;;
    terminal|term)
        shift
        open_terminal "$*"
        exit 0
        ;;
    remote)
        shift
        connection_id="$1"
        shift
        open_remote "$connection_id" "$*"
        exit 0
        ;;
esac

for arg in "$@"; do
    case "$arg" in
        -*) continue ;;
    esac
    open_path_arg "$arg"
done
"#
   )
}

#[cfg(windows)]
fn windows_cmd_script() -> String {
   r#"@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0coodi.ps1" %*
"#
   .to_string()
}

#[cfg(windows)]
fn windows_powershell_script() -> String {
   format!(
      r#"$ErrorActionPreference = "Stop"

function Show-Help {{
@"
{help}
"@ | Write-Host
}}

function Encode-Param([string] $Value) {{
  return [System.Uri]::EscapeDataString($Value)
}}

function Open-CoodiUrl([string] $Url) {{
  Start-Process $Url | Out-Null
}}

function Start-CoodiApp {{
  if (Test-Path "$env:LOCALAPPDATA\Programs\Coodi\Coodi.exe") {{
    Start-Process "$env:LOCALAPPDATA\Programs\Coodi\Coodi.exe" | Out-Null
    return
  }}

  if (Test-Path "$env:PROGRAMFILES\Coodi\Coodi.exe") {{
    Start-Process "$env:PROGRAMFILES\Coodi\Coodi.exe" | Out-Null
    return
  }}

  Write-Error "Coodi installation not found"
  exit 1
}}

function Open-PathArg([string] $Arg) {{
  $file = $Arg
  $line = $null

  if ($Arg -match "^(?<file>.+):(?<line>[0-9]+)$") {{
    $file = $Matches["file"]
    $line = $Matches["line"]
  }}

  if (-not (Test-Path -LiteralPath $file)) {{
    Write-Error "coodi: $file: No such file or directory"
    return
  }}

  $resolved = (Resolve-Path -LiteralPath $file).Path
  $isDirectory = Test-Path -LiteralPath $resolved -PathType Container
  $query = "coodi://open?path=$(Encode-Param $resolved)"

  if ($line) {{
    $query += "&line=$line"
  }}

  if ($isDirectory) {{
    $query += "&type=directory"
  }}

  Open-CoodiUrl $query
}}

function Open-Web([string] $Url) {{
  if ([string]::IsNullOrWhiteSpace($Url)) {{
    Write-Error "coodi: web requires a URL"
    exit 1
  }}

  Open-CoodiUrl "coodi://open?type=web&url=$(Encode-Param $Url)"
}}

function Open-Terminal([string[]] $CommandParts) {{
  $cwd = (Get-Location).Path
  $query = "coodi://open?type=terminal&cwd=$(Encode-Param $cwd)"

  if ($CommandParts.Count -gt 0) {{
    $command = ($CommandParts -join " ").Trim()
    if ($command.Length -gt 0) {{
      $query += "&command=$(Encode-Param $command)"
    }}
  }}

  Open-CoodiUrl $query
}}

function Open-Remote([string[]] $RemoteArgs) {{
  if ($RemoteArgs.Count -eq 0) {{
    Write-Error "coodi: remote requires a connection id"
    exit 1
  }}

  $connectionId = $RemoteArgs[0]
  $query = "coodi://open?type=remote&connectionId=$(Encode-Param $connectionId)"

  if ($RemoteArgs.Count -gt 1) {{
    $name = ($RemoteArgs[1..($RemoteArgs.Count - 1)] -join " ").Trim()
    if ($name.Length -gt 0) {{
      $query += "&name=$(Encode-Param $name)"
    }}
  }}

  Open-CoodiUrl $query
}}

if ($args.Count -eq 0) {{
  Start-CoodiApp
  exit 0
}}

$command = $args[0].ToLowerInvariant()
switch ($command) {{
  "help" {{ Show-Help; exit 0 }}
  "-h" {{ Show-Help; exit 0 }}
  "--help" {{ Show-Help; exit 0 }}
  "open" {{
    if ($args.Count -lt 2) {{
      Write-Error "coodi: open requires at least one path"
      exit 1
    }}

    foreach ($arg in $args[1..($args.Count - 1)]) {{
      if ($arg.StartsWith("-")) {{ continue }}
      Open-PathArg $arg
    }}

    exit 0
  }}
  "web" {{ Open-Web $(if ($args.Count -gt 1) {{ $args[1] }} else {{ $null }}); exit 0 }}
  "terminal" {{ Open-Terminal $(if ($args.Count -gt 1) {{ $args[1..($args.Count - 1)] }} else {{ @() }}); exit 0 }}
  "term" {{ Open-Terminal $(if ($args.Count -gt 1) {{ $args[1..($args.Count - 1)] }} else {{ @() }}); exit 0 }}
  "remote" {{ Open-Remote $(if ($args.Count -gt 1) {{ $args[1..($args.Count - 1)] }} else {{ @() }}); exit 0 }}
}}

foreach ($arg in $args) {{
  if ($arg.StartsWith("-")) {{ continue }}
  Open-PathArg $arg
}}
"#,
      help = CLI_HELP_TEXT
   )
}

#[cfg(target_os = "macos")]
fn macos_app_name(app: &AppHandle) -> &'static str {
   match app_identifier_suffix(app) {
      Some("preview") => "Coodi Preview",
      Some("dev") => "Coodi Dev",
      _ => "Coodi",
   }
}

#[cfg(target_os = "macos")]
fn macos_open_url_body() -> &'static str {
   r#"    local url="$1"
    if open "$url"; then
        return 0
    fi

    case "$url" in
        *://*)
            local current_scheme="${url%%://*}"
            local rest="${url#*://}"
            for fallback_scheme in coodi coodi-preview coodi-dev; do
                [ "$fallback_scheme" = "$current_scheme" ] && continue
                if open "${fallback_scheme}://${rest}" 2>/dev/null; then
                    return 0
                fi
            done
            ;;
    esac

    return 1"#
}

#[cfg(target_os = "macos")]
fn macos_launch_app_block(app_name: &str) -> String {
   format!(
      r#"    for app_name in "{app_name}" "Coodi" "Coodi Preview" "Coodi Dev"; do
        if [ -d "/Applications/${{app_name}}.app" ]; then
            open -a "/Applications/${{app_name}}.app"
            exit 0
        elif [ -d "$HOME/Applications/${{app_name}}.app" ]; then
            open -a "$HOME/Applications/${{app_name}}.app"
            exit 0
        elif open -a "$app_name" 2>/dev/null; then
            exit 0
        fi
    done

    echo "Coodi installation not found" >&2
    exit 1"#
   )
}

#[cfg(target_os = "macos")]
fn build_macos_cli_script(app: &AppHandle) -> String {
   let app_name = macos_app_name(app);
   let deep_link_scheme = deep_link_scheme(app);
   let launch_app_block = macos_launch_app_block(app_name);
   unix_cli_script(macos_open_url_body(), &launch_app_block, deep_link_scheme)
}

#[cfg(target_os = "macos")]
#[command]
pub fn install_cli_command(app: AppHandle) -> Result<String, String> {
   let cli_path = get_cli_script_path()?;
   let bin_dir = cli_path
      .parent()
      .ok_or_else(|| "Failed to get parent directory".to_string())?;

   if !bin_dir.exists() {
      fs::create_dir_all(bin_dir).map_err(|e| format!("Failed to create directory: {}", e))?;
   }

   fs::write(&cli_path, build_macos_cli_script(&app))
      .map_err(|e| format!("Failed to write CLI script: {}", e))?;

   let mut perms = fs::metadata(&cli_path)
      .map_err(|e| format!("Failed to get file permissions: {}", e))?
      .permissions();
   perms.set_mode(0o755);
   fs::set_permissions(&cli_path, perms)
      .map_err(|e| format!("Failed to set executable permissions: {}", e))?;

   Ok(format!(
      "CLI command installed successfully at {}.\n\nNote: Make sure {} is in your PATH. Add this \
       to your ~/.zshrc or ~/.bashrc:\nexport PATH=\"$HOME/.local/bin:$PATH\"",
      cli_path.display(),
      bin_dir.display()
   ))
}

#[cfg(all(unix, not(target_os = "macos")))]
#[command]
pub fn install_cli_command() -> Result<String, String> {
   let cli_path = get_cli_script_path()?;
   let bin_dir = cli_path
      .parent()
      .ok_or_else(|| "Failed to get parent directory".to_string())?;

   let launch_app_block = r#"    COODI_BIN=$(command -v /usr/bin/coodi 2>/dev/null || command -v coodi 2>/dev/null || find /opt /usr/local /usr/bin -name "coodi" -type f 2>/dev/null | head -1)
    if [ -n "$COODI_BIN" ] && [ -x "$COODI_BIN" ]; then
        "$COODI_BIN" &
    else
        echo "Coodi not found. Please ensure it is installed."
        exit 1
    fi"#;
   let script_content = unix_cli_script("    xdg-open \"$1\"", launch_app_block, "coodi");

   if !bin_dir.exists() {
      fs::create_dir_all(bin_dir).map_err(|e| format!("Failed to create directory: {}", e))?;
   }

   fs::write(&cli_path, script_content)
      .map_err(|e| format!("Failed to write CLI script: {}", e))?;

   let mut perms = fs::metadata(&cli_path)
      .map_err(|e| format!("Failed to get file permissions: {}", e))?
      .permissions();
   perms.set_mode(0o755);
   fs::set_permissions(&cli_path, perms)
      .map_err(|e| format!("Failed to set executable permissions: {}", e))?;

   Ok(format!(
      "CLI command installed successfully at {}.\n\nNote: Make sure {} is in your PATH. Add this \
       to your ~/.zshrc or ~/.bashrc:\nexport PATH=\"$HOME/.local/bin:$PATH\"",
      cli_path.display(),
      bin_dir.display()
   ))
}

#[cfg(windows)]
#[command]
pub fn install_cli_command() -> Result<String, String> {
   let cli_path = get_cli_script_path()?;
   let powershell_path = get_cli_powershell_path()?;
   let bin_dir = cli_path
      .parent()
      .ok_or_else(|| "Failed to get parent directory".to_string())?;

   if !bin_dir.exists() {
      fs::create_dir_all(bin_dir).map_err(|e| format!("Failed to create bin directory: {}", e))?;
   }

   fs::write(&cli_path, windows_cmd_script())
      .map_err(|e| format!("Failed to write CLI script: {}", e))?;
   fs::write(&powershell_path, windows_powershell_script())
      .map_err(|e| format!("Failed to write PowerShell CLI script: {}", e))?;

   let path_instruction = format!(
      "CLI command installed successfully at {}.\n\nTo use 'coodi' from anywhere, add the \
       following directory to your PATH:\n{}\n\nYou can do this by:\n1. Search for 'Environment \
       Variables' in Windows Settings\n2. Edit the 'Path' variable under User variables\n3. Add \
       the directory above\n4. Restart your terminal",
      cli_path.display(),
      bin_dir.display()
   );

   Ok(path_instruction)
}

#[cfg(target_os = "macos")]
#[command]
pub fn get_cli_install_command(app: AppHandle) -> Result<String, String> {
   let script = build_macos_cli_script(&app);

   Ok(format!(
      "mkdir -p ~/.local/bin && cat > ~/.local/bin/coodi << 'SCRIPT'\n{}\nSCRIPT\nchmod +x \
       ~/.local/bin/coodi",
      script.trim()
   ))
}

#[cfg(all(unix, not(target_os = "macos")))]
#[command]
pub fn get_cli_install_command() -> Result<String, String> {
   let launch_app_block = r#"    COODI_BIN=$(command -v /usr/bin/coodi 2>/dev/null || command -v coodi 2>/dev/null || find /opt /usr/local /usr/bin -name "coodi" -type f 2>/dev/null | head -1)
    if [ -n "$COODI_BIN" ] && [ -x "$COODI_BIN" ]; then
        "$COODI_BIN" &
    else
        echo "Coodi not found. Please ensure it is installed."
        exit 1
    fi"#;
   let script = unix_cli_script("    xdg-open \"$1\"", launch_app_block, "coodi");
   Ok(format!(
      "mkdir -p ~/.local/bin && cat > ~/.local/bin/coodi << 'EOF'\n{}\nEOF\nchmod +x \
       ~/.local/bin/coodi",
      script.trim()
   ))
}

#[cfg(windows)]
#[command]
pub fn get_cli_install_command() -> Result<String, String> {
   let powershell_script = windows_powershell_script().replace('\'', "''");
   Ok(format!(
      r#"mkdir "%USERPROFILE%\.coodi\bin" 2>nul && (
echo @echo off
echo powershell -NoProfile -ExecutionPolicy Bypass -File "%%~dp0coodi.ps1" %%*
) > "%USERPROFILE%\.coodi\bin\coodi.cmd" && powershell -NoProfile -ExecutionPolicy Bypass -Command "$script = @'
{powershell_script}
'@; Set-Content -LiteralPath \"$env:USERPROFILE\.coodi\bin\coodi.ps1\" -Value $script""#
   ))
}

#[cfg(unix)]
#[command]
pub fn uninstall_cli_command() -> Result<String, String> {
   let cli_path = get_cli_script_path()?;

   if !cli_path.exists() {
      return Err("CLI command is not installed".to_string());
   }

   fs::remove_file(&cli_path).map_err(|e| format!("Failed to remove CLI script: {}", e))?;

   Ok("CLI command uninstalled successfully".to_string())
}

#[cfg(windows)]
#[command]
pub fn uninstall_cli_command() -> Result<String, String> {
   let cli_path = get_cli_script_path()?;
   let powershell_path = get_cli_powershell_path()?;

   if !cli_path.exists() {
      return Err("CLI command is not installed".to_string());
   }

   fs::remove_file(&cli_path).map_err(|e| format!("Failed to remove CLI script: {}", e))?;
   if powershell_path.exists() {
      fs::remove_file(&powershell_path)
         .map_err(|e| format!("Failed to remove PowerShell CLI script: {}", e))?;
   }

   Ok("CLI command uninstalled successfully".to_string())
}

/// On Linux, silently fix a CLI script that contains macOS commands (`open -a`).
/// Called once during app startup to auto-repair wrong-platform scripts.
#[cfg(all(unix, not(target_os = "macos")))]
pub fn auto_fix_cli_on_startup() {
   let cli_path = match get_cli_script_path() {
      Ok(p) => p,
      Err(_) => return,
   };

   if !cli_path.exists() {
      return;
   }

   if validate_cli_script(&cli_path) {
      return;
   }

   log::info!(
      "CLI script at {} contains macOS commands, rewriting with Linux version",
      cli_path.display()
   );

   match install_cli_command() {
      Ok(_) => log::info!("CLI script auto-fixed successfully"),
      Err(e) => log::warn!("Failed to auto-fix CLI script: {}", e),
   }
}
