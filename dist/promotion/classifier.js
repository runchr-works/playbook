import { z } from "zod";
const decisionSchema = z.object({
    promote: z.boolean(),
    confidence: z.number().min(0).max(1),
    reusable: z.boolean(),
    factual: z.boolean(),
    sensitive: z.boolean(),
    ttl: z.string().nullable().optional(),
    reason: z.string(),
});
export class OpenAICompatiblePromotionClassifier {
    options;
    constructor(options) {
        this.options = options;
    }
    async classify(input) {
        const response = await fetch(`${this.options.baseUrl.replace(/\/$/, "")}/chat/completions`, {
            method: "POST",
            headers: {
                authorization: `Bearer ${this.options.apiKey}`,
                "content-type": "application/json",
            },
            signal: AbortSignal.timeout(this.options.timeoutMs ?? 30_000),
            body: JSON.stringify({
                model: this.options.model,
                temperature: 0,
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        name: "promotion_decision",
                        strict: true,
                        schema: {
                            type: "object",
                            additionalProperties: false,
                            required: ["promote", "confidence", "reusable", "factual", "sensitive", "ttl", "reason"],
                            properties: {
                                promote: { type: "boolean" },
                                confidence: { type: "number", minimum: 0, maximum: 1 },
                                reusable: { type: "boolean" },
                                factual: { type: "boolean" },
                                sensitive: { type: "boolean" },
                                ttl: { type: ["string", "null"] },
                                reason: { type: "string" },
                            },
                        },
                    },
                },
                messages: [
                    {
                        role: "system",
                        content: "Decide whether a private agent memory is a durable, factual, non-sensitive project fact useful to other agents. Reject guesses, temporary state, credentials, personal data, and agent-specific preferences.",
                    },
                    {
                        role: "user",
                        content: JSON.stringify({
                            content: input.content,
                            context: input.context ?? null,
                            confidence: input.metadata?.confidence ?? null,
                            freshness: input.metadata?.freshness ?? null,
                            evidenceRefs: input.metadata?.evidenceRefs ?? [],
                        }),
                    },
                ],
            }),
        });
        if (!response.ok)
            throw new Error(`Promotion classifier ${response.status}: ${await response.text()}`);
        const body = await response.json();
        const content = body.choices?.[0]?.message?.content;
        if (!content)
            throw new Error("Promotion classifier returned no content");
        return decisionSchema.parse(JSON.parse(content));
    }
}
//# sourceMappingURL=classifier.js.map