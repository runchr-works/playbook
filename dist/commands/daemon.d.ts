export declare function hindsightPid(): number | undefined;
export declare function isProcessRunning(pid: number): boolean;
export declare function startHindsightDaemon(env: NodeJS.ProcessEnv): Promise<number>;
export declare function stopHindsightDaemon(): boolean;
