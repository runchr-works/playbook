import { stdout } from "node:process";
import { Writable } from "node:stream";

export class MaskedOutput extends Writable {
  muted = false;

  constructor(private readonly destination: NodeJS.WritableStream = stdout) {
    super();
  }

  override _write(
    chunk: Buffer | string,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    const value = typeof chunk === "string" ? chunk : chunk.toString("utf8");
    this.destination.write(this.muted ? value.replace(/[^\r\n]/g, "*") : value);
    callback();
  }
}
