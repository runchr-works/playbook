import { spawn } from "node:child_process";

export async function checkHindsightHealth(
  baseUrl: string,
  timeoutMs = 3_000,
): Promise<{ ok: boolean; detail: string }> {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/health`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    return response.ok
      ? { ok: true, detail: `healthy (${response.status})` }
      : { ok: false, detail: `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

export async function waitForHindsight(
  baseUrl: string,
  timeoutMs = 180_000,
  intervalMs = 1_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await checkHindsightHealth(baseUrl)).ok) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

export async function startHindsight(
  hindsightEnv: Record<string, string>,
): Promise<number> {
  const child = spawn("uvx", ["--from", "hindsight-api", "hindsight-local-mcp"], {
    detached: true,
    env: { ...process.env, ...hindsightEnv },
    stdio: "ignore",
  });
  await new Promise<void>((resolve, reject) => {
    child.once("spawn", resolve);
    child.once("error", reject);
  });
  if (!child.pid) throw new Error("Failed to start Hindsight.");
  child.unref();
  return child.pid;
}
