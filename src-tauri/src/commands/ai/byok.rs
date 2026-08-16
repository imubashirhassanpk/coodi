use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
   fs,
   path::{Component, Path, PathBuf},
   time::Duration,
};
use tauri::command;
use tokio::{process::Command, time::timeout};
use walkdir::WalkDir;

const MAX_FILE_BYTES: usize = 2 * 1024 * 1024;
const MAX_LIST_ENTRIES: usize = 2_000;
const MAX_COMMAND_OUTPUT_BYTES: usize = 64 * 1024;
const DEFAULT_COMMAND_TIMEOUT_MS: u64 = 15_000;
const MAX_COMMAND_TIMEOUT_MS: u64 = 30_000;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ByokToolRequest {
   pub workspace_root: Option<String>,
   pub tool_name: String,
   pub arguments: Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct FileResult {
   path: String,
   content: String,
   bytes: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct FileWriteResult {
   path: String,
   bytes_written: usize,
   created: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PatchResult {
   path: String,
   replacements: usize,
   bytes_written: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CommandResult {
   program: String,
   args: Vec<String>,
   exit_code: Option<i32>,
   stdout: String,
   stderr: String,
}

#[command]
pub async fn preview_byok_tool(request: ByokToolRequest) -> Result<Value, String> {
   let workspace_root = resolve_workspace_root(request.workspace_root)?;
   let arguments = request
      .arguments
      .as_object()
      .ok_or_else(|| "BYOK tool arguments must be a JSON object.".to_string())?;

   match request.tool_name.as_str() {
      "create_file" => {
         let path = required_string(arguments, "path")?;
         let content = file_content(required_text(arguments, "content")?)?;
         let resolved = resolve_workspace_file(&workspace_root, path, true)?;
         if resolved.exists() {
            return Err("The file already exists; preview refused to overwrite it.".to_string());
         }
         Ok(json!({
            "kind": "file",
            "path": relative_path(&workspace_root, &resolved),
            "oldText": "",
            "newText": content,
         }))
      }
      "write_file" => {
         let path = required_string(arguments, "path")?;
         let content = file_content(required_text(arguments, "content")?)?;
         let resolved = resolve_workspace_file(&workspace_root, path, false)?;
         let current = fs::read_to_string(&resolved)
            .map_err(|_| "BYOK write_file only supports UTF-8 text files.".to_string())?;
         if let Some(expected) = optional_text(arguments, "expectedContent")
            && current != expected
         {
            return Err("File changed since the model read it; preview refused stale contents.".to_string());
         }
         Ok(json!({
            "kind": "file",
            "path": relative_path(&workspace_root, &resolved),
            "oldText": current,
            "newText": content,
         }))
      }
      "apply_patch" => {
         let path = required_string(arguments, "path")?;
         let old_text = required_text(arguments, "oldText")?;
         let new_text = required_text(arguments, "newText")?;
         let expected = arguments
            .get("expectedOccurrences")
            .and_then(Value::as_u64)
            .unwrap_or(1)
            .clamp(1, 20) as usize;
         let resolved = resolve_workspace_file(&workspace_root, path, false)?;
         let current = fs::read_to_string(&resolved)
            .map_err(|_| "BYOK apply_patch only supports UTF-8 text files.".to_string())?;
         let occurrences = current.match_indices(old_text).count();
         if old_text.is_empty() || occurrences != expected {
            return Err(format!("Patch preview expected {expected} occurrence(s), found {occurrences}."));
         }
         let updated = current.replace(old_text, new_text);
         file_content(&updated)?;
         Ok(json!({
            "kind": "file",
            "path": relative_path(&workspace_root, &resolved),
            "oldText": current,
            "newText": updated,
         }))
      }
      "run_terminal_command" => {
         let program = required_string(arguments, "program")?;
         let args = arguments
            .get("args")
            .and_then(Value::as_array)
            .ok_or_else(|| "run_terminal_command requires an args array.".to_string())?
            .iter()
            .map(|value| value.as_str().map(ToString::to_string).ok_or_else(|| "Command arguments must be strings.".to_string()))
            .collect::<Result<Vec<_>, _>>()?;
         validate_command(program, &args)?;
         Ok(json!({
            "kind": "command",
            "command": format!("{} {}", program, args.join(" ")),
         }))
      }
      _ => Ok(json!({ "kind": "none" })),
   }
}

#[command]
pub async fn execute_byok_tool(request: ByokToolRequest) -> Result<Value, String> {
   let workspace_root = resolve_workspace_root(request.workspace_root)?;
   let arguments = request
      .arguments
      .as_object()
      .ok_or_else(|| "BYOK tool arguments must be a JSON object.".to_string())?;

   match request.tool_name.as_str() {
      "read_file" => read_file(&workspace_root, arguments),
      "list_files" => list_files(&workspace_root, arguments),
      "create_file" => create_file(&workspace_root, arguments),
      "write_file" => write_file(&workspace_root, arguments),
      "apply_patch" => apply_patch(&workspace_root, arguments),
      "run_terminal_command" => run_terminal_command(&workspace_root, arguments).await,
      other => Err(format!("Unsupported BYOK tool: {other}")),
   }
}

fn resolve_workspace_root(value: Option<String>) -> Result<PathBuf, String> {
   let raw = value
      .filter(|value| !value.trim().is_empty())
      .ok_or_else(|| "A bound workspace is required for BYOK tools.".to_string())?;
   if raw.contains('\0') {
      return Err("Workspace path contains an invalid NUL byte.".to_string());
   }
   let root = PathBuf::from(raw);
   if !root.is_absolute() {
      return Err("Workspace path must be absolute.".to_string());
   }
   let root = root
      .canonicalize()
      .map_err(|error| format!("Failed to resolve workspace: {error}"))?;
   if !root.is_dir() {
      return Err("Bound workspace is not a directory.".to_string());
   }
   Ok(root)
}

fn resolve_workspace_file(root: &Path, raw_path: &str, allow_missing: bool) -> Result<PathBuf, String> {
   let raw_path = raw_path.trim();
   if raw_path.is_empty() {
      return Err("File path is required.".to_string());
   }
   if raw_path.contains('\0') {
      return Err("File path contains an invalid NUL byte.".to_string());
   }

   let requested = Path::new(raw_path);
   if requested.is_absolute() {
      return Err("BYOK file paths must be workspace-relative.".to_string());
   }
   for component in requested.components() {
      match component {
         Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
            return Err("Path traversal and absolute paths are not allowed.".to_string());
         }
         Component::CurDir | Component::Normal(_) => {}
      }
   }

   let candidate = root.join(requested);
   if candidate.exists() {
      let resolved = candidate
         .canonicalize()
         .map_err(|error| format!("Failed to resolve workspace file: {error}"))?;
      ensure_inside(root, &resolved)?;
      return Ok(resolved);
   }
   if !allow_missing {
      return Err("Workspace file does not exist.".to_string());
   }

   let parent = candidate
      .parent()
      .ok_or_else(|| "File path must include a parent directory.".to_string())?;
   let resolved_parent = parent
      .canonicalize()
      .map_err(|error| format!("Failed to resolve file parent directory: {error}"))?;
   ensure_inside(root, &resolved_parent)?;
   let file_name = candidate
      .file_name()
      .ok_or_else(|| "File path must include a file name.".to_string())?;
   Ok(resolved_parent.join(file_name))
}

fn ensure_inside(root: &Path, path: &Path) -> Result<(), String> {
   if !path.starts_with(root) {
      return Err("BYOK operation must stay inside the bound workspace.".to_string());
   }
   Ok(())
}

fn required_string<'a>(arguments: &'a serde_json::Map<String, Value>, name: &str) -> Result<&'a str, String> {
   arguments
      .get(name)
      .and_then(Value::as_str)
      .map(str::trim)
      .filter(|value| !value.is_empty())
      .ok_or_else(|| format!("BYOK tool argument '{name}' is required."))
}

fn optional_string<'a>(arguments: &'a serde_json::Map<String, Value>, name: &str) -> Option<&'a str> {
   arguments
      .get(name)
      .and_then(Value::as_str)
      .map(str::trim)
      .filter(|value| !value.is_empty())
}

fn optional_text<'a>(arguments: &'a serde_json::Map<String, Value>, name: &str) -> Option<&'a str> {
   arguments.get(name).and_then(Value::as_str)
}

fn required_text<'a>(arguments: &'a serde_json::Map<String, Value>, name: &str) -> Result<&'a str, String> {
   arguments
      .get(name)
      .and_then(Value::as_str)
      .ok_or_else(|| format!("BYOK tool argument '{name}' must be a string."))
}

fn file_content(value: &str) -> Result<&str, String> {
   if value.as_bytes().len() > MAX_FILE_BYTES {
      return Err(format!("File content exceeds the {} MiB BYOK limit.", MAX_FILE_BYTES / 1024 / 1024));
   }
   Ok(value)
}

fn relative_path(root: &Path, path: &Path) -> String {
   path.strip_prefix(root)
      .unwrap_or(path)
      .to_string_lossy()
      .replace('\\', "/")
}

fn read_file(root: &Path, arguments: &serde_json::Map<String, Value>) -> Result<Value, String> {
   let requested = required_string(arguments, "path")?;
   let path = resolve_workspace_file(root, requested, false)?;
   let bytes = fs::read(&path).map_err(|error| format!("Failed to read workspace file: {error}"))?;
   if bytes.len() > MAX_FILE_BYTES {
      return Err(format!("Workspace file exceeds the {} MiB BYOK limit.", MAX_FILE_BYTES / 1024 / 1024));
   }
   let content = String::from_utf8(bytes).map_err(|_| "BYOK file tools only support UTF-8 text files.".to_string())?;
   serde_json::to_value(FileResult {
      path: relative_path(root, &path),
      bytes: content.as_bytes().len(),
      content,
   })
   .map_err(|error| error.to_string())
}

fn list_files(root: &Path, arguments: &serde_json::Map<String, Value>) -> Result<Value, String> {
   let requested = optional_string(arguments, "path").unwrap_or(".");
   let path = resolve_workspace_file(root, requested, false)?;
   if !path.is_dir() {
      return Err("list_files requires a workspace directory.".to_string());
   }
   let max_depth = arguments
      .get("maxDepth")
      .and_then(Value::as_u64)
      .unwrap_or(2)
      .min(4) as usize;
   let mut entries = Vec::new();
   for entry in WalkDir::new(&path).min_depth(1).max_depth(max_depth + 1).follow_links(false) {
      let entry = entry.map_err(|error| format!("Failed to list workspace files: {error}"))?;
      if entries.len() >= MAX_LIST_ENTRIES {
         break;
      }
      entries.push(json!({
         "path": relative_path(root, entry.path()),
         "kind": if entry.file_type().is_dir() { "directory" } else { "file" },
      }));
   }
   entries.sort_by(|left, right| left["path"].as_str().cmp(&right["path"].as_str()));
   Ok(json!({ "path": relative_path(root, &path), "entries": entries, "truncated": entries.len() >= MAX_LIST_ENTRIES }))
}

fn create_file(root: &Path, arguments: &serde_json::Map<String, Value>) -> Result<Value, String> {
   let requested = required_string(arguments, "path")?;
   let content = file_content(required_text(arguments, "content")?)?;
   let path = resolve_workspace_file(root, requested, true)?;
   if path.exists() {
      return Err("create_file refuses to overwrite an existing file; use write_file or apply_patch.".to_string());
   }
   if let Some(parent) = path.parent() {
      fs::create_dir_all(parent).map_err(|error| format!("Failed to create parent directory: {error}"))?;
   }
   fs::write(&path, content).map_err(|error| format!("Failed to create workspace file: {error}"))?;
   serde_json::to_value(FileWriteResult {
      path: relative_path(root, &path),
      bytes_written: content.as_bytes().len(),
      created: true,
   })
   .map_err(|error| error.to_string())
}

fn write_file(root: &Path, arguments: &serde_json::Map<String, Value>) -> Result<Value, String> {
   let requested = required_string(arguments, "path")?;
   let content = file_content(required_text(arguments, "content")?)?;
   let path = resolve_workspace_file(root, requested, false)?;
   let current = fs::read_to_string(&path).map_err(|_| "BYOK write_file only supports UTF-8 text files.".to_string())?;
   if let Some(expected) = optional_text(arguments, "expectedContent")
      && current != expected
   {
      return Err("File changed since the model read it; refusing to overwrite stale contents.".to_string());
   }
   fs::write(&path, content).map_err(|error| format!("Failed to update workspace file: {error}"))?;
   serde_json::to_value(FileWriteResult {
      path: relative_path(root, &path),
      bytes_written: content.as_bytes().len(),
      created: false,
   })
   .map_err(|error| error.to_string())
}

fn apply_patch(root: &Path, arguments: &serde_json::Map<String, Value>) -> Result<Value, String> {
   let requested = required_string(arguments, "path")?;
   let old_text = required_text(arguments, "oldText")?;
   let new_text = required_text(arguments, "newText")?;
   if old_text.is_empty() {
      return Err("apply_patch requires non-empty oldText.".to_string());
   }
   let expected = arguments
      .get("expectedOccurrences")
      .and_then(Value::as_u64)
      .unwrap_or(1)
      .clamp(1, 20) as usize;
   let path = resolve_workspace_file(root, requested, false)?;
   let current = fs::read_to_string(&path).map_err(|_| "BYOK apply_patch only supports UTF-8 text files.".to_string())?;
   let occurrences = current.match_indices(old_text).count();
   if occurrences != expected {
      return Err(format!("apply_patch expected {expected} occurrence(s), found {occurrences}."));
   }
   let updated = current.replace(old_text, new_text);
   file_content(&updated)?;
   fs::write(&path, &updated).map_err(|error| format!("Failed to apply workspace patch: {error}"))?;
   serde_json::to_value(PatchResult {
      path: relative_path(root, &path),
      replacements: occurrences,
      bytes_written: updated.as_bytes().len(),
   })
   .map_err(|error| error.to_string())
}

async fn run_terminal_command(root: &Path, arguments: &serde_json::Map<String, Value>) -> Result<Value, String> {
   let program = required_string(arguments, "program")?.to_string();
   let args = arguments
      .get("args")
      .and_then(Value::as_array)
      .ok_or_else(|| "run_terminal_command requires an args array.".to_string())?
      .iter()
      .map(|value| value.as_str().map(ToString::to_string).ok_or_else(|| "Command arguments must be strings.".to_string()))
      .collect::<Result<Vec<_>, _>>()?;
   validate_command(&program, &args)?;
   let timeout_ms = arguments
      .get("timeoutMs")
      .and_then(Value::as_u64)
      .unwrap_or(DEFAULT_COMMAND_TIMEOUT_MS)
      .clamp(1_000, MAX_COMMAND_TIMEOUT_MS);

   let mut command = Command::new(&program);
   command
      .args(&args)
      .current_dir(root)
      .kill_on_drop(true)
      .env_remove("OPENAI_API_KEY")
      .env_remove("NVIDIA_API_KEY")
      .env_remove("NVAPI_KEY");

   let child = command
      .output();
   let output = timeout(Duration::from_millis(timeout_ms), child)
      .await
      .map_err(|_| format!("Command timed out after {timeout_ms} ms."))?
      .map_err(|error| format!("Failed to run allowlisted command: {error}"))?;

   let stdout = truncate_output(String::from_utf8_lossy(&output.stdout).as_ref());
   let stderr = truncate_output(String::from_utf8_lossy(&output.stderr).as_ref());
   serde_json::to_value(CommandResult {
      program,
      args,
      exit_code: output.status.code(),
      stdout,
      stderr,
   })
   .map_err(|error| error.to_string())
}

fn truncate_output(value: &str) -> String {
   if value.len() <= MAX_COMMAND_OUTPUT_BYTES {
      return value.to_string();
   }
   let mut end = MAX_COMMAND_OUTPUT_BYTES;
   while !value.is_char_boundary(end) {
      end -= 1;
   }
   format!("{}\n[output truncated]", &value[..end])
}

fn args_equal(args: &[String], expected: &[&str]) -> bool {
   args.len() == expected.len() && args.iter().zip(expected).all(|(actual, wanted)| actual == wanted)
}

fn validate_command(program: &str, args: &[String]) -> Result<(), String> {
   if !matches!(program, "git" | "pnpm" | "cargo") {
      return Err("Command is not allowlisted. Allowed programs: git, pnpm, cargo.".to_string());
   }
   for value in std::iter::once(program).chain(args.iter().map(String::as_str)) {
      if value.is_empty()
         || value.contains('\0')
         || value.contains("..")
         || value.starts_with('/')
         || value.contains(':')
         || ["|", ";", "&&", "||", ">", "<", "`", "$(", "\\n", "\\r"].iter().any(|token| value.contains(token))
      {
         return Err("Shell operators, traversal, empty arguments, and command substitution are not allowed.".to_string());
      }
   }

   let allowed = match program {
      "git" => matches!(args.first().map(String::as_str), Some("status" | "diff" | "log" | "show" | "branch" | "grep" | "rev-parse" | "ls-files")),
      "pnpm" => {
         args_equal(args, &["test"])
            || args_equal(args, &["exec", "tsc", "--noEmit", "--pretty", "false"])
            || args_equal(args, &["exec", "vp", "build"])
            || (args.len() >= 4 && args[0] == "exec" && args[1] == "vp" && args[2] == "test" && args[3] == "run")
      }
      "cargo" => args_equal(args, &["check"]) || args_equal(args, &["test"]),
      _ => false,
   };
   if !allowed {
      return Err("Command arguments are not allowlisted for BYOK execution.".to_string());
   }
   Ok(())
}

#[cfg(test)]
mod tests {
   use super::validate_command;

   #[test]
   fn accepts_read_only_git_command() {
      assert!(validate_command("git", &["status".into(), "--short".into()]).is_ok());
   }

   #[test]
   fn rejects_shell_injection_and_destructive_commands() {
      assert!(validate_command("git", &["status; rm -rf .".into()]).is_err());
      assert!(validate_command("rm", &["-rf".into(), ".".into()]).is_err());
      assert!(validate_command("pnpm", &["exec".into(), "../evil".into()]).is_err());
   }
}
