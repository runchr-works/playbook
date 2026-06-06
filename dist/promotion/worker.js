import { preflightPromotion } from "./policy.js";
export class PromotionWorker {
    outbox;
    memory;
    classifier;
    confidenceThreshold;
    pollIntervalMs;
    timer;
    running = false;
    constructor(outbox, memory, classifier, confidenceThreshold, pollIntervalMs) {
        this.outbox = outbox;
        this.memory = memory;
        this.classifier = classifier;
        this.confidenceThreshold = confidenceThreshold;
        this.pollIntervalMs = pollIntervalMs;
    }
    start() {
        this.outbox.recover();
        this.timer = setInterval(() => void this.tick(), this.pollIntervalMs);
        this.timer.unref();
        void this.tick();
    }
    async stop() {
        if (this.timer)
            clearInterval(this.timer);
        while (this.running)
            await new Promise((resolve) => setTimeout(resolve, 10));
    }
    async tick() {
        if (this.running)
            return;
        const job = this.outbox.claim();
        if (!job)
            return;
        this.running = true;
        try {
            const preflight = preflightPromotion(job.payload);
            if (!preflight.allowed) {
                this.outbox.complete(job.id, { promote: false, reason: preflight.reason ?? "Policy rejected" });
                return;
            }
            const decision = await this.classifier.classify(job.payload);
            const approved = decision.promote &&
                decision.reusable &&
                decision.factual &&
                !decision.sensitive &&
                decision.confidence >= this.confidenceThreshold;
            if (approved) {
                const claim = this.outbox.beginPromotion(job.sourceId);
                if (claim === "busy")
                    throw new Error("Memory promotion is already in progress");
                if (claim === "not-found")
                    throw new Error("Retained memory is missing");
                if (claim === "acquired") {
                    try {
                        await this.memory.promote(job.payload, job.sourceId, "automatic");
                        this.outbox.completePromotion(job.sourceId, "automatic");
                    }
                    catch (error) {
                        this.outbox.releasePromotion(job.sourceId);
                        throw error;
                    }
                }
            }
            this.outbox.complete(job.id, { ...decision, promote: approved });
        }
        catch (error) {
            this.outbox.retry(job.id, job.attempts, error);
        }
        finally {
            this.running = false;
        }
    }
}
//# sourceMappingURL=worker.js.map