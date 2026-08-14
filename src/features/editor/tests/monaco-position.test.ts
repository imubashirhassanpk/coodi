import { describe, expect, it } from "vite-plus/test";
import { createCoodiModelUriParts, filePathFromCoodiModelUri } from "../engines/monaco/model-uri";

describe("Monaco model URIs", () => {
  it("keeps the internal buffer identity out of the visible file path", () => {
    const uri = createCoodiModelUriParts(
      "buffer__Users_mehmetozgul_project_loading_tsx_1784828747746",
      "/Users/mehmetozgul/project/src/components/loading.tsx",
    );

    expect(uri.path).toBe("/Users/mehmetozgul/project/src/components/loading.tsx");
    expect(uri.query).toContain("buffer=");
    expect(uri.path).not.toContain("buffer_");
  });

  it("keeps models unique when the same path has multiple editor surfaces", () => {
    const first = createCoodiModelUriParts("buffer_first", "/workspace/src/file.ts");
    const second = createCoodiModelUriParts("buffer_second", "/workspace/src/file.ts");

    expect(first.path).toBe(second.path);
    expect(first.query).not.toBe(second.query);
  });

  it("uses a workspace-relative label without losing the real file path", () => {
    const uri = createCoodiModelUriParts(
      "buffer_loading",
      "/Users/mehmetozgul/project/src/components/loading.tsx",
      "src/components/loading.tsx",
    );

    expect(uri.path).toBe("/src/components/loading.tsx");
    expect(filePathFromCoodiModelUri(uri.path, uri.query)).toBe(
      "/Users/mehmetozgul/project/src/components/loading.tsx",
    );
  });

  it("recovers POSIX and Windows file paths from Coodi model URIs", () => {
    const posixUri = createCoodiModelUriParts("buffer_posix", "/workspace/src/file.ts");
    const windowsUri = createCoodiModelUriParts("buffer_windows", "C:/workspace/src/file.ts");

    expect(filePathFromCoodiModelUri(posixUri.path, posixUri.query)).toBe("/workspace/src/file.ts");
    expect(filePathFromCoodiModelUri(windowsUri.path, windowsUri.query)).toBe(
      "C:/workspace/src/file.ts",
    );
  });

  it("decodes escaped model paths", () => {
    expect(filePathFromCoodiModelUri("/workspace/my%20file.ts", "")).toBe("/workspace/my file.ts");
  });
});
