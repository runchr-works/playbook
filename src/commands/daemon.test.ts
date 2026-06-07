import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { saveUserConfig } from "../user-config.js";
import {
  checkHindsightHealth,
  daemonCommand,
  hindsightPid,
  isProcessRunning,
  waitForHindsight,
} from "./daemon.js";

const temporaryDirectories: string[] = [];

function temporaryHome(): string {
  const directory = mkdtempSync(path.join(tmpdir(), "intentir-daemon-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  process.exitCode = undefined;
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Hindsight daemon management", () => {
  it("reads a managed PID from INTENTIR_HOME", () => {
    const home = temporaryHome();
    mkdirSync(home, { recursive: true });
    writeFileSync(path.join(home, "hindsight.pid"), `${process.pid}\n`);

    expect(hindsightPid({ INTENTIR_HOME: home })).toBe(process.pid);
    expect(isProcessRunning(process.pid)).toBe(true);
  });

  it("reports health responses and fetch failures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockRejectedValueOnce(new Error("connection refused"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(checkHindsightHealth("http://localhost:8888/")).resolves.toEqual({
      ok: true,
      detail: "healthy (200)",
    });
    await expect(checkHindsightHealth("http://localhost:8888")).resolves.toEqual({
      ok: false,
      detail: "connection refused",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8888/health",
      expect.any(Object),
    );
  });

  it("waits until Hindsight becomes healthy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockRejectedValueOnce(new Error("not ready"))
        .mockResolvedValueOnce(new Response(null, { status: 200 })),
    );

    await expect(waitForHindsight("http://localhost:8888", 100, 1)).resolves.toBe(true);
  });

  it("shows daemon status using the onboarded server configuration", async () => {
    const home = temporaryHome();
    const env = { INTENTIR_HOME: home };
    const now = new Date().toISOString();
    saveUserConfig({
      version: 1,
      hindsightMode: "existing",
      env: { HINDSIGHT_BASE_URL: "https://hindsight.example" },
      createdAt: now,
      updatedAt: now,
    }, env);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );
    const output = vi.spyOn(console, "log").mockImplementation(() => {});

    await daemonCommand("status", [], env);

    expect(JSON.parse(String(output.mock.calls[0]?.[0]))).toMatchObject({
      mode: "existing",
      baseUrl: "https://hindsight.example",
      managedPid: null,
      managedProcessRunning: false,
      ok: true,
    });
    expect(process.exitCode).toBeUndefined();
  });

  it("rejects local daemon control for an existing server", async () => {
    const home = temporaryHome();
    const env = { INTENTIR_HOME: home };
    const now = new Date().toISOString();
    saveUserConfig({
      version: 1,
      hindsightMode: "existing",
      env: { HINDSIGHT_BASE_URL: "https://hindsight.example" },
      createdAt: now,
      updatedAt: now,
    }, env);

    await expect(daemonCommand("stop", [], env)).rejects.toThrow(
      "unavailable in existing-server mode",
    );
  });
});
