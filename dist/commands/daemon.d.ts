export declare function hindsightPid(env?: NodeJS.ProcessEnv): number | undefined;
export declare function isProcessRunning(pid: number): boolean;
export declare function startHindsightDaemon(hindsightEnv: NodeJS.ProcessEnv, processEnv?: NodeJS.ProcessEnv): Promise<number>;
export declare function stopHindsightDaemon(env?: NodeJS.ProcessEnv): boolean;
export declare function checkHindsightHealth(baseUrl: string, timeoutMs?: number): Promise<{
    ok: boolean;
    detail: string;
}>;
export declare function waitForHindsight(baseUrl: string, timeoutMs?: number, intervalMs?: number): Promise<boolean>;
export declare function runHindsightDaemon(hindsightEnv: NodeJS.ProcessEnv, processEnv?: NodeJS.ProcessEnv): Promise<number>;
export declare function daemonCommand(action: string | undefined, args: string[], env?: NodeJS.ProcessEnv): Promise<void>;
