import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  RTK_BLOCK_START,
  RTK_BLOCK_END,
  RTK_INSTRUCTIONS,
  getRtkInstructionPaths,
  injectRtkAgentInstructions,
} from "./rtk.js";

const directories: string[] = [];

function directory(): string {
  const root = mkdtempSync(path.join(tmpdir(), "memkit-rtk-"));
  directories.push(root);
  return root;
}

afterEach(() => {
  for (const root of directories.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("getRtkInstructionPaths", () => {
  it("returns CLAUDE.md for any agent", () => {
    const home = directory();
    const paths = getRtkInstructionPaths("cursor", home);
    expect(paths).toContain(path.join(home, "CLAUDE.md"));
  });

  it("returns CLAUDE.md + AGENTS.md for pi", () => {
    const home = directory();
    const paths = getRtkInstructionPaths("pi", home);
    expect(paths).toContain(path.join(home, "CLAUDE.md"));
    expect(paths).toContain(path.join(home, ".pi", "agent", "AGENTS.md"));
  });

  it("returns only CLAUDE.md for claude-code", () => {
    const home = directory();
    const paths = getRtkInstructionPaths("claude-code", home);
    expect(paths).toHaveLength(1);
    expect(paths[0]).toBe(path.join(home, "CLAUDE.md"));
  });
});

describe("injectRtkAgentInstructions", () => {
  it("injects RTK block into CLAUDE.md", () => {
    const home = directory();
    const results = injectRtkAgentInstructions("cursor", home);
    expect(results).toHaveLength(1);
    expect(results[0].configured).toBe(true);
    expect(results[0].path).toBe(path.join(home, "CLAUDE.md"));

    const content = readFileSync(results[0].path, "utf8");
    expect(content).toContain(RTK_BLOCK_START);
    expect(content).toContain(RTK_BLOCK_END);
    expect(content).toContain("rtk git status");
  });

  it("injects into both files for pi", () => {
    const home = directory();
    const results = injectRtkAgentInstructions("pi", home);
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.configured)).toBe(true);

    const claudeContent = readFileSync(results[0].path, "utf8");
    expect(claudeContent).toContain(RTK_BLOCK_START);

    const agentsContent = readFileSync(results[1].path, "utf8");
    expect(agentsContent).toContain(RTK_BLOCK_START);
  });

  it("is idempotent — re-injection does not duplicate the block", () => {
    const home = directory();

    injectRtkAgentInstructions("codex", home);
    injectRtkAgentInstructions("codex", home);

    const content = readFileSync(path.join(home, "CLAUDE.md"), "utf8");
    const occurrences = content.split(RTK_BLOCK_START).length - 1;
    expect(occurrences).toBe(1);
  });

  it("does not overwrite existing content outside the RTK block", () => {
    const home = directory();
    const claudePath = path.join(home, "CLAUDE.md");

    // Pre-existing content
    mkdirSync(home, { recursive: true });
    writeFileSync(claudePath, "# My Custom Instructions\n\nRun my custom command.\n");

    injectRtkAgentInstructions("codex", home);

    const content = readFileSync(claudePath, "utf8");
    expect(content).toContain("# My Custom Instructions");
    expect(content).toContain(RTK_BLOCK_START);
  });
});

describe("RTK_INSTRUCTIONS", () => {
  it("starts and ends with the correct markers", () => {
    expect(RTK_INSTRUCTIONS.startsWith(RTK_BLOCK_START)).toBe(true);
    expect(RTK_INSTRUCTIONS.endsWith(RTK_BLOCK_END)).toBe(true);
  });

  it("contains the Golden Rule", () => {
    expect(RTK_INSTRUCTIONS).toContain("Always prefix commands with `rtk`");
  });

  it("contains the token savings overview table", () => {
    expect(RTK_INSTRUCTIONS).toContain("Token Savings Overview");
  });
});
