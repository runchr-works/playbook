import { describe, expect, it } from "vitest";
import { DisabledCodeProvider } from "./codegraph.js";

describe("DisabledCodeProvider", () => {
  it("returns workspace_not_initialized for code operations", async () => {
    const provider = new DisabledCodeProvider(["missing .intentir/config.json"]);

    await expect(provider.search({ query: "AuthService" }))
      .rejects.toThrow("workspace_not_initialized");
    await expect(provider.context("trace auth"))
      .rejects.toMatchObject({ code: "workspace_not_initialized" });
    expect(await provider.health()).toEqual({
      ok: false,
      detail: "workspace_not_initialized: missing .intentir/config.json",
    });
  });
});
