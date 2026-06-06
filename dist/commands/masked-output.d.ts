import { Writable } from "node:stream";
export declare class MaskedOutput extends Writable {
    private readonly destination;
    muted: boolean;
    constructor(destination?: NodeJS.WritableStream);
    _write(chunk: Buffer | string, encoding: BufferEncoding, callback: (error?: Error | null) => void): void;
}
