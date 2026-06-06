import { describe, expect, it } from "vitest";
import {
  HINDSIGHT_LLM_RECOMMENDATIONS,
  recommendationFor,
} from "./llm-recommendations.js";

describe("Hindsight LLM recommendations", () => {
  it("provides unique providers with non-empty default models", () => {
    const providers = HINDSIGHT_LLM_RECOMMENDATIONS.map((item) => item.provider);
    expect(new Set(providers).size).toBe(providers.length);
    expect(HINDSIGHT_LLM_RECOMMENDATIONS.every((item) => item.defaultModel.length > 0))
      .toBe(true);
  });

  it("only marks providers with OpenAI-compatible endpoints as reusable", () => {
    expect(recommendationFor("openai")).toMatchObject({ promotionCompatible: true });
    expect(recommendationFor("groq")).toMatchObject({ promotionCompatible: true });
    expect(recommendationFor("anthropic")).toMatchObject({ promotionCompatible: false });
    expect(recommendationFor("gemini")).toMatchObject({ promotionCompatible: false });
  });
});
