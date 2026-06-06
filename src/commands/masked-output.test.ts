import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { MaskedOutput } from "./masked-output.js";

function destination(output: string[]): Writable {
  return new Writable({
    write(chunk, _encoding, callback) {
      output.push(String(chunk));
      callback();
    },
  });
}

describe("MaskedOutput", () => {
  it("accepts Buffer chunks when readline reports buffer encoding", async () => {
    const output: string[] = [];
    const stream = new MaskedOutput(destination(output));

    await new Promise<void>((resolve, reject) => {
      stream._write(Buffer.from("Prompt: "), "buffer" as BufferEncoding, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    expect(output.join("")).toBe("Prompt: ");
  });

  it("masks non-newline characters while muted", async () => {
    const output: string[] = [];
    const stream = new MaskedOutput(destination(output));
    stream.muted = true;

    await new Promise<void>((resolve, reject) => {
      stream.write("secret\n", (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    expect(output.join("")).toBe("******\n");
  });
});
