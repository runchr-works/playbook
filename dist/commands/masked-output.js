import { stdout } from "node:process";
import { Writable } from "node:stream";
export class MaskedOutput extends Writable {
    destination;
    muted = false;
    constructor(destination = stdout) {
        super();
        this.destination = destination;
    }
    _write(chunk, encoding, callback) {
        const value = typeof chunk === "string" ? chunk : chunk.toString("utf8");
        this.destination.write(this.muted ? value.replace(/[^\r\n]/g, "*") : value);
        callback();
    }
}
//# sourceMappingURL=masked-output.js.map