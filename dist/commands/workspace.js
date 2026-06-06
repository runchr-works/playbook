import path from "node:path";
import { deriveRepositoryId, deriveWorkspaceId, removeWorkspaceState, workspaceState, writeWorkspaceConfig, } from "../workspace.js";
import { runCommand } from "./process.js";
function option(args, name) {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
}
function parse(args) {
    const valueOptions = new Set(["--org", "--project", "--workspace", "--repository"]);
    let positional;
    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        if (!arg)
            continue;
        if (valueOptions.has(arg)) {
            index += 1;
            continue;
        }
        if (!arg.startsWith("-")) {
            positional = arg;
            break;
        }
    }
    const orgId = option(args, "--org");
    const projectId = option(args, "--project");
    const workspaceId = option(args, "--workspace");
    const repositoryId = option(args, "--repository");
    return {
        path: path.resolve(positional ?? process.cwd()),
        ...(orgId ? { orgId } : {}),
        ...(projectId ? { projectId } : {}),
        ...(workspaceId ? { workspaceId } : {}),
        ...(repositoryId ? { repositoryId } : {}),
        purgeGraph: args.includes("--purge-graph"),
    };
}
async function gitRemote(repositoryRoot) {
    const result = await runCommand("git", ["remote", "get-url", "origin"], { cwd: repositoryRoot });
    return result.code === 0 ? result.stdout.trim() : undefined;
}
export async function workspaceCommand(action, args) {
    const input = parse(args);
    if (action === "init") {
        const orgId = input.orgId ?? process.env.INTENTIR_ORG_ID;
        const projectId = input.projectId ?? process.env.INTENTIR_PROJECT_ID;
        if (!orgId || !projectId) {
            throw new Error("workspace init requires --org and --project or matching environment variables");
        }
        const repositoryId = input.repositoryId ??
            deriveRepositoryId(await gitRemote(input.path), input.path);
        const workspaceId = input.workspaceId ?? deriveWorkspaceId(input.path);
        const command = process.env.CODEGRAPH_COMMAND ?? "codegraph";
        const result = await runCommand(command, ["init", input.path, "-i"], {
            cwd: input.path,
            inherit: true,
        });
        if (result.code !== 0)
            throw new Error(`CodeGraph init failed with exit code ${result.code}`);
        const config = writeWorkspaceConfig(input.path, {
            orgId,
            projectId,
            workspaceId,
            repositoryId,
        });
        console.log(JSON.stringify({ initialized: true, ...config }, null, 2));
        return;
    }
    if (action === "status") {
        const state = workspaceState(input.path);
        let codegraph = { ok: false, detail: "workspace_not_initialized" };
        if (state.initialized) {
            const result = await runCommand(process.env.CODEGRAPH_COMMAND ?? "codegraph", ["status", input.path, "--json"], { cwd: input.path });
            codegraph = result.code === 0
                ? parseJsonOrText(result.stdout)
                : { ok: false, detail: result.stderr.trim() || `exit ${result.code}` };
        }
        console.log(JSON.stringify({ workspace: state, codegraph }, null, 2));
        return;
    }
    if (action === "sync") {
        const state = workspaceState(input.path);
        if (!state.initialized) {
            throw new Error(`workspace_not_initialized: ${state.reasons.join("; ")}`);
        }
        const result = await runCommand(process.env.CODEGRAPH_COMMAND ?? "codegraph", ["sync", input.path], { cwd: input.path, inherit: true });
        if (result.code !== 0)
            throw new Error(`CodeGraph sync failed with exit code ${result.code}`);
        return;
    }
    if (action === "remove") {
        removeWorkspaceState(input.path, input.purgeGraph);
        console.log(JSON.stringify({
            removed: true,
            repositoryRoot: input.path,
            graphRemoved: input.purgeGraph,
        }, null, 2));
        return;
    }
    throw new Error("Usage: intentir workspace <init|status|sync|remove> [path]");
}
function parseJsonOrText(value) {
    try {
        return JSON.parse(value);
    }
    catch {
        return { ok: true, output: value.trim() };
    }
}
//# sourceMappingURL=workspace.js.map