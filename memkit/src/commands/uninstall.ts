import os from "node:os";
import path from "node:path";
import { rmSync } from "node:fs";
import { removeUserConfig } from "../user-config.js";

export function uninstallCommand(purge: boolean): void {
  removeUserConfig();
  if (purge) {
    rmSync(path.join(os.homedir(), ".pg0", "hindsight-mcp"), {
      recursive: true,
      force: true,
    });
  }
  console.log(JSON.stringify({
    uninstalled: true,
    localHindsightDataPurged: purge,
    note: "Removed memkit global config. Hindsight server is managed separately.",
  }, null, 2));
}
