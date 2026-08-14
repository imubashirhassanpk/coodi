import { describe, expect, it, vi } from "vite-plus/test";
import {
  buildGitHubRepositoryRef,
  resolveGitHubNotificationRepoPath,
} from "../utils/github-notification-routing";

describe("GitHub notification repository routing", () => {
  it("uses the matching local workspace repository", async () => {
    const loadRemotes = vi.fn(async (repoPath: string) => [
      {
        name: "origin",
        url:
          repoPath === "/workspace/www"
            ? "git@github.com:coodidev/www.git"
            : "https://github.com/mubashirhassanpk/coodi.git",
      },
    ]);

    await expect(
      resolveGitHubNotificationRepoPath(
        "coodidev/www",
        ["/workspace/coodi", "/workspace/www"],
        loadRemotes,
      ),
    ).resolves.toBe("/workspace/www");
  });

  it("uses an API-backed repository reference when the repo is not local", async () => {
    const loadRemotes = vi.fn(async () => [
      { name: "origin", url: "https://github.com/mubashirhassanpk/coodi.git" },
    ]);

    await expect(
      resolveGitHubNotificationRepoPath("indent-com/neo", ["/workspace/coodi"], loadRemotes),
    ).resolves.toBe("github://indent-com/neo");
  });

  it("rejects malformed repository names", async () => {
    expect(buildGitHubRepositoryRef("mubashirhassanpk/coodi/extra")).toBeNull();
    await expect(resolveGitHubNotificationRepoPath("../coodi", [], vi.fn())).resolves.toBeNull();
  });
});
