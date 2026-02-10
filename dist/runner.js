export class EvalRunner {
    criteria;
    judge;
    constructor(opts) {
        this.criteria = opts.criteria;
        this.judge = opts.judge;
    }
    /** Get criteria that apply to a given content type */
    getCriteria(contentType) {
        return this.criteria.filter((c) => c.contentTypes === '*' || c.contentTypes.includes(contentType));
    }
    /** Run full evaluation (deterministic + LLM judge criteria) */
    async evaluate(input) {
        const applicable = this.getCriteria(input.contentType);
        const deterministic = applicable.filter((c) => c.method === 'deterministic');
        const llm = applicable.filter((c) => c.method === 'llm_judge');
        // Run deterministic criteria first (fast, parallel)
        const detScores = await Promise.all(deterministic.map((c) => c.evaluate(input)));
        // Run LLM judge criteria (parallel, requires judge)
        const llmScores = await Promise.all(llm.map((c) => {
            if (!this.judge) {
                throw new Error(`LLM judge required for criterion "${c.name}" but none provided`);
            }
            return c.evaluate(input, this.judge);
        }));
        const scores = [...detScores, ...llmScores];
        return this.buildResult(scores, applicable, input.contentType);
    }
    /** Run only deterministic checks (no API calls) */
    async quickCheck(input) {
        const applicable = this.getCriteria(input.contentType).filter((c) => c.method === 'deterministic');
        const scores = await Promise.all(applicable.map((c) => c.evaluate(input)));
        return this.buildResult(scores, applicable, input.contentType);
    }
    buildResult(scores, applicable, contentType) {
        // Build weight map from applicable criteria
        const weightMap = new Map(applicable.map((c) => [c.name, c.weight]));
        let totalWeight = 0;
        let weightedSum = 0;
        for (const score of scores) {
            const weight = weightMap.get(score.criterion) ?? 1;
            weightedSum += score.score * weight;
            totalWeight += weight;
        }
        const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
        const passed = scores.every((s) => s.passed);
        return {
            overallScore,
            passed,
            scores,
            contentType,
            evaluatedAt: new Date().toISOString(),
        };
    }
}
//# sourceMappingURL=runner.js.map