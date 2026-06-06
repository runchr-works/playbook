import { spawn } from "node:child_process";
export function runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            ...(options.cwd ? { cwd: options.cwd } : {}),
            env: { ...process.env, ...options.env },
            stdio: options.inherit ? "inherit" : ["ignore", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        child.stdout?.on("data", (chunk) => { stdout += String(chunk); });
        child.stderr?.on("data", (chunk) => { stderr += String(chunk); });
        child.once("error", reject);
        child.once("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
    });
}
export async function commandExists(command) {
    try {
        const result = await runCommand(command, ["--version"]);
        return result.code === 0;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=process.js.map