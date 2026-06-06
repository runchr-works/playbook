export interface CommandResult {
    code: number;
    stdout: string;
    stderr: string;
}
export declare function runCommand(command: string, args: string[], options?: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    inherit?: boolean;
}): Promise<CommandResult>;
export declare function commandExists(command: string): Promise<boolean>;
