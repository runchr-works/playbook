import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";
import { saveUserConfig } from "./user-config.js";
import { writeWorkspaceConfig } from "./workspace.js";

const directories: string[] = [];

function temporaryDirectory(): string {
  const directory = mkdtempSync(path.join(tmpdir(), "intentir-config-"));
  directories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("loadConfig", () => {
  it("merges global settings, workspace identity, and process overrides", () => {
    const home = temporaryDirectory();
    const repositoryRoot = temporaryDirectory();
    saveUserConfig({
      version: 1,
      hindsightMode: "existing",
      env: {
        HINDSIGHT_BASE_URL: "http://configured:8888",
      },
      createdAt: "2026-06-07T00:00:00.000Z",
      updatedAt: "2026-06-07T00:00:00.000Z",
    }, { INTENTIR_HOME: home });
    writeWorkspaceConfig(repositoryRoot, {
      bankId: "project-bank",
    });
    mkdirSync(path.join(repositoryRoot, ".codegraph"), { recursive: true });
    writeFileSync(path.join(repositoryRoot, ".codegraph", "codegraph.db"), "");

    const config = loadConfig({
      INTENTIR_HOME: home,
      INTENTIR_REPOSITORY_ROOT: repositoryRoot,
    });

    expect(config.identity).toEqual({
      bankId: "project-bank",
    });
    expect(config.hindsight.baseUrl).toBe("http://configured:8888");
    expect(config.workspace.initialized).toBe(true);
  });

  it("requires repository initialization even when legacy identity environment variables exist", () => {
    const home = temporaryDirectory();
    const repositoryRoot = temporaryDirectory();
    expect(() => loadConfig({
      INTENTIR_HOME: home,
      INTENTIR_REPOSITORY_ROOT: repositoryRoot,
    })).toThrow("intentir init --bank <bank-id>");
  });

  it("allows Hindsight identity when CodeGraph initialization is incomplete", () => {
    const home = temporaryDirectory();
    const repositoryRoot = temporaryDirectory();
    writeWorkspaceConfig(repositoryRoot, {
      bankId: "shared-bank",
    });
    const config = loadConfig({
      INTENTIR_HOME: home,
      INTENTIR_REPOSITORY_ROOT: repositoryRoot,
    });

    expect(config.identity.bankId).toBe("shared-bank");
    expect(config.workspace.intentirInitialized).toBe(true);
    expect(config.workspace.codegraphInitialized).toBe(false);
  });

});
