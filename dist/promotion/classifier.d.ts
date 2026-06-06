import type { PromotionClassifier, PromotionDecision, RetainInput } from "../types.js";
interface ClassifierOptions {
    baseUrl: string;
    apiKey: string;
    model: string;
    timeoutMs?: number;
}
export declare class OpenAICompatiblePromotionClassifier implements PromotionClassifier {
    private readonly options;
    constructor(options: ClassifierOptions);
    classify(input: RetainInput): Promise<PromotionDecision>;
}
export {};
