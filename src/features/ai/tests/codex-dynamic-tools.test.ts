import { describe, expect, it, vi } from "vite-plus/test";
import {
  COODI_OPEN_ISSUE_TOOL,
  COODI_OPEN_PULL_REQUEST_TOOL,
  COODI_SET_CHAT_TITLE_TOOL,
  runCodexDynamicTool,
} from "@/features/ai/integrations/codex/codex-dynamic-tools";

describe("Codex dynamic tools", () => {
  it("opens a pull request in the current workspace", () => {
    const openPullRequest = vi.fn(() => "pull-request://42");
    const openIssue = vi.fn(() => "");

    const result = runCodexDynamicTool(
      COODI_OPEN_PULL_REQUEST_TOOL,
      { number: 42, title: "Open PRs inside Coodi" },
      {
        projectRoot: "/workspace/coodi",
        openPullRequest,
        openIssue,
        setChatTitle: vi.fn(() => true),
      },
    );

    expect(openPullRequest).toHaveBeenCalledWith(42, {
      repoPath: "/workspace/coodi",
      title: "Open PRs inside Coodi",
      initialView: "activity",
    });
    expect(result).toEqual({
      contentItems: [{ type: "inputText", text: "Pull request #42 opened in Coodi." }],
      success: true,
    });
  });

  it("opens an issue in the current workspace", () => {
    const openIssue = vi.fn(() => "github-issue://735");

    const result = runCodexDynamicTool(
      COODI_OPEN_ISSUE_TOOL,
      { number: 735, title: "Test issue" },
      {
        projectRoot: "/workspace/coodi",
        openPullRequest: vi.fn(() => ""),
        openIssue,
        setChatTitle: vi.fn(() => true),
      },
    );

    expect(openIssue).toHaveBeenCalledWith({
      issueNumber: 735,
      repoPath: "/workspace/coodi",
      title: "Test issue",
    });
    expect(result).toEqual({
      contentItems: [{ type: "inputText", text: "Issue #735 opened in Coodi." }],
      success: true,
    });
  });

  it("rejects an invalid pull request number", () => {
    const openPullRequest = vi.fn(() => "");

    const result = runCodexDynamicTool(
      COODI_OPEN_PULL_REQUEST_TOOL,
      { number: 0 },
      {
        projectRoot: "/workspace/coodi",
        openPullRequest,
        openIssue: vi.fn(() => ""),
        setChatTitle: vi.fn(() => true),
      },
    );

    expect(openPullRequest).not.toHaveBeenCalled();
    expect(result?.success).toBe(false);
  });

  it("renames the current Coodi chat", () => {
    const setChatTitle = vi.fn(() => true);

    const result = runCodexDynamicTool(
      COODI_SET_CHAT_TITLE_TOOL,
      { title: "  Issue history  " },
      {
        projectRoot: "/workspace/coodi",
        openPullRequest: vi.fn(() => ""),
        openIssue: vi.fn(() => ""),
        setChatTitle,
      },
    );

    expect(setChatTitle).toHaveBeenCalledWith("Issue history");
    expect(result?.success).toBe(true);
  });

  it("leaves unknown tools for another handler", () => {
    const result = runCodexDynamicTool(
      "unknown_tool",
      {},
      {
        projectRoot: "/workspace/coodi",
        openPullRequest: vi.fn(() => ""),
        openIssue: vi.fn(() => ""),
        setChatTitle: vi.fn(() => true),
      },
    );

    expect(result).toBeNull();
  });
});
