import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  deriveRepositoryId,
  deriveWorkspaceId,
  removeWorkspaceState,
  workspaceState,
  writeWorkspaceConfig,
} from "./workspace.js";

const directories: string[] = [];

function repository(): string {
  const root = mkdtempSync(path.join(tmpdir(), "intentir-workspace-"));
  directories.push(root);
  return root;
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("workspace state", () => {
  it("requires both Intentir config and CodeGraph database", () => {
    const root = repository();
    writeWorkspaceConfig(root, {
      orgId: "org",
      projectId: "project",
      workspaceId: "workspace",
      repositoryId: "repository",
    });
    expect(workspaceState(root)).toMatchObject({
      initialized: false,
      reasons: ["missing .codegraph/codegraph.db"],
    });

    mkdirSync(path.join(root, ".codegraph"), { recursive: true });
    writeFileSync(path.join(root, ".codegraph", "codegraph.db"), "");
    expect(workspaceState(root).initialized).toBe(true);
  });

  it("removes Intentir state and preserves graph by default", () => {
    const root = repository();
    writeWorkspaceConfig(root, {
      orgId: "org",
      projectId: "project",
      workspaceId: "workspace",
      repositoryId: "repository",
    });
    mkdirSync(path.join(root, ".codegraph"), { recursive: true });
    writeFileSync(path.join(root, ".codegraph", "codegraph.db"), "");

    removeWorkspaceState(root, false);

    expect(workspaceState(root).reasons).toContain("missing .intentir/config.json");
    expect(workspaceState(root).reasons).not.toContain("missing .codegraph/codegraph.db");
  });

  it("derives stable workspace and repository identifiers", () => {
    const root = repository();
    expect(deriveWorkspaceId(root)).toBe(deriveWorkspaceId(root));
    expect(deriveRepositoryId("git@github.com:runchr-works/intentir.git", root))
      .toBe("runchr-works/intentir");
  });
});
