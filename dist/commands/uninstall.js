import os from "node:os";
import path from "node:path";
import { rmSync } from "node:fs";
import { removeUserConfig } from "../user-config.js";
import { stopHindsightDaemon } from "./daemon.js";
export function uninstallCommand(purge) {
    const stopped = stopHindsightDaemon();
    removeUserConfig();
    if (purge) {
        rmSync(path.join(os.homedir(), ".pg0", "hindsight-mcp"), {
            recursive: true,
            force: true,
        });
    }
    console.log(JSON.stringify({
        uninstalled: true,
        managedHindsightStopped: stopped,
        localHindsightDataPurged: purge,
        note: "CodeGraph and repository indexes were preserved.",
    }, null, 2));
}
//# sourceMappingURL=uninstall.js.map