import { invoke } from "@tauri-apps/api/core";
import type { ContextInfo } from "@/features/ai/types/ai-context.types";
import type {
  ProviderToolCall,
  ProviderToolDefinition,
} from "@/features/ai/services/providers/ai-provider-interface";

export const BYOK_TOOL_MAX_ROUNDS = 8;
export const BYOK_TOOL_MAX_FILE_BYTES = 2 * 1024 * 1024;

export type ByokToolName =
  | "read_file"
  | "list_files"
  | "create_file"
  | "write_file"
  | "apply_patch"
  | "run_terminal_command";

export interface ByokToolPermissionRequest {
  requestId: string;
  toolName: ByokToolName;
  description: string;
  resource: string;
  input: Record<string, unknown>;
}

export interface ByokToolResult {
  output?: unknown;
  error?: string;
}

export interface ByokToolExecutionContext {
  projectRoot?: string;
}

export const BYOK_TOOL_DEFINITIONS: ProviderToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a UTF-8 text file inside the current Coodi workspace.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Workspace-relative file path." },
        },
        required: ["path"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List files and directories inside the current Coodi workspace.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Workspace-relative directory path; defaults to ." },
          maxDepth: { type: "number", description: "Maximum traversal depth from the directory, 0-4." },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_file",
      description: "Create a new UTF-8 text file inside the current Coodi workspace. Fails if it already exists.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Workspace-relative target file path." },
          content: { type: "string", description: "Complete UTF-8 file contents." },
        },
        required: ["path", "content"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Replace the complete contents of an existing UTF-8 text file inside the workspace.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Workspace-relative target file path." },
          content: { type: "string", description: "Complete replacement contents." },
          expectedContent: {
            type: "string",
            description: "Optional current contents; if supplied, the write fails when the file changed.",
          },
        },
        required: ["path", "content"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "apply_patch",
      description: "Apply one exact old-text to new-text replacement in a UTF-8 workspace file.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Workspace-relative target file path." },
          oldText: { type: "string", description: "Exact text to replace." },
          newText: { type: "string", description: "Replacement text." },
          expectedOccurrences: {
            type: "number",
            description: "Expected number of matches; defaults to 1 and must be between 1 and 20.",
          },
        },
        required: ["path", "oldText", "newText"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_terminal_command",
      description:
        "Run one explicitly allowlisted non-shell development command in the workspace. Never use shell operators, pipes, redirects, or command substitution.",
      parameters: {
        type: "object",
        properties: {
          program: { type: "string", description: "Allowlisted executable name, such as git, pnpm, or cargo." },
          args: { type: "array", items: { type: "string" }, description: "Literal command arguments; no shell syntax." },
          timeoutMs: { type: "number", description: "Timeout between 1000 and 30000 milliseconds." },
        },
        required: ["program", "args"],
        additionalProperties: false,
      },
    },
  },
];

const TOOL_NAME_SET = new Set<ByokToolName>([
  "read_file",
  "list_files",
  "create_file",
  "write_file",
  "apply_patch",
  "run_terminal_command",
]);

export function isByokToolName(value: string): value is ByokToolName {
  return TOOL_NAME_SET.has(value as ByokToolName);
}

export function parseByokToolArguments(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("tool arguments must be a JSON object");
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    throw new Error(`Invalid tool arguments: ${error instanceof Error ? error.message : "invalid JSON"}`);
  }
}

export function getByokToolDescription(
  toolName: ByokToolName,
  input: Record<string, unknown>,
): Pick<ByokToolPermissionRequest, "description" | "resource"> {
  const path = typeof input.path === "string" ? input.path : "workspace";
  if (toolName === "run_terminal_command") {
    const program = typeof input.program === "string" ? input.program : "command";
    const args = Array.isArray(input.args) ? input.args.filter((item): item is string => typeof item === "string") : [];
    return {
      description: `Run allowlisted command: ${[program, ...args].join(" ")}`,
      resource: "workspace terminal",
    };
  }
  if (toolName === "read_file") {
    return { description: `Read workspace file ${path}`, resource: path };
  }
  if (toolName === "list_files") {
    return { description: `List workspace files under ${path || "."}`, resource: path || "." };
  }
  return { description: `${toolName.replace(/_/g, " ")} in workspace file ${path}`, resource: path };
}

export async function executeByokTool(
  toolCall: ProviderToolCall,
  context: ByokToolExecutionContext | ContextInfo,
): Promise<ByokToolResult> {
  if (!isByokToolName(toolCall.function.name)) {
    return { error: `Unsupported BYOK tool: ${toolCall.function.name}` };
  }

  let input: Record<string, unknown>;
  try {
    input = parseByokToolArguments(toolCall.function.arguments);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid tool arguments" };
  }

  try {
    const output = await invoke("execute_byok_tool", {
      request: {
        workspaceRoot: context.projectRoot ?? null,
        toolName: toolCall.function.name,
        arguments: input,
      },
    });
    return { output };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
