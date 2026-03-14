/** Convert an InlineRubric into a full EvalCriterion for the runner */
function rubricToCriterion(rubric) {
    const judgeRubric = {
        criterion: rubric.name,
        description: rubric.description,
        scale: rubric.scale,
        examples: rubric.examples,
    };
    const threshold = rubric.threshold ?? 0.5;
    return {
        name: rubric.name,
        description: rubric.description,
        contentTypes: '*',
        method: 'llm_judge',
        threshold,
        weight: rubric.weight ?? 1.0,
        optional: rubric.optional ?? false,
        async evaluate(input, judge) {
            if (!judge)
                throw new Error(`Judge required for rubric "${rubric.name}"`);
            const context = input.topic ? `Topic: ${input.topic}` : undefined;
            const result = await judge.score(input.content, judgeRubric, context);
            const score = (result.score - 1) / 4;
            return {
                criterion: rubric.name,
                score,
                rawScore: result.score,
                maxScore: 5,
                passed: score >= threshold,
                reasoning: result.reasoning,
                suggestions: result.suggestions ?? [],
            };
        },
    };
}
export class EvalRunner {
    criteria;
    judge;
    knownContentTypes;
    constructor(opts) {
        this.criteria = opts.criteria;
        this.judge = opts.judge;
        this.knownContentTypes = new Set(opts.criteria
            .flatMap((c) => (c.contentTypes === '*' ? [] : c.contentTypes)));
    }
    /** Get the set of content types recognized by registered criteria */
    getKnownContentTypes() {
        return [...this.knownContentTypes].sort();
    }
    /** Get criteria that apply to a given content type */
    getCriteria(contentType) {
        this.validateContentType(contentType);
        return this.criteria.filter((c) => c.contentTypes === '*' || c.contentTypes.includes(contentType));
    }
    validateContentType(contentType) {
        if (this.knownContentTypes.size > 0 && !this.knownContentTypes.has(contentType)) {
            const known = [...this.knownContentTypes].sort().join(', ');
            throw new Error(`Unknown content type "${contentType}". Known types: ${known}`);
        }
    }
    /** Resolve the full set of criteria for an input (registered + inline rubrics) */
    resolveCriteria(input) {
        let registered = [];
        if (input.contentType) {
            // Content type provided — get matching registered criteria
            registered = this.getCriteria(input.contentType);
        }
        else {
            // No content type — only include universal (contentTypes: '*') registered criteria
            registered = this.criteria.filter((c) => c.contentTypes === '*');
        }
        // Convert inline rubrics to criteria
        const inline = (input.rubrics ?? []).map(rubricToCriterion);
        return [...registered, ...inline];
    }
    /** Run full evaluation (deterministic + LLM judge criteria) */
    async evaluate(input) {
        const applicable = this.resolveCriteria(input);
        if (applicable.length === 0) {
            throw new Error('No criteria to evaluate. Provide a contentType, inline rubrics, or both.');
        }
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
        const applicable = this.resolveCriteria(input).filter((c) => c.method === 'deterministic');
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