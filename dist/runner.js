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
        const optionalNames = new Set(applicable.filter((c) => c.optional).map((c) => c.name));
        const passed = scores
            .filter((s) => !optionalNames.has(s.criterion))
            .every((s) => s.passed);
        const feedback = this.buildFeedback(scores, applicable);
        return {
            overallScore,
            passed,
            scores,
            feedback,
            contentType,
            evaluatedAt: new Date().toISOString(),
        };
    }
    buildFeedback(scores, applicable) {
        const weightMap = new Map(applicable.map((c) => [c.name, c.weight]));
        const failedCriteria = scores
            .filter((s) => !s.passed)
            .map((s) => ({
            criterion: s.criterion,
            reasoning: s.reasoning,
            suggestions: s.suggestions ?? [],
        }));
        const strengths = scores
            .filter((s) => s.score >= 0.75)
            .map((s) => s.reasoning);
        // Aggregate suggestions from failed + low-scoring criteria, sorted by weight descending
        const lowScoring = scores
            .filter((s) => !s.passed || s.score < 0.75)
            .sort((a, b) => (weightMap.get(b.criterion) ?? 1) - (weightMap.get(a.criterion) ?? 1));
        const suggestions = lowScoring.flatMap((s) => s.suggestions ?? []);
        return { failedCriteria, strengths, suggestions };
    }
}
//# sourceMappingURL=runner.js.map