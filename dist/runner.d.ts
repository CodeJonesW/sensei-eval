import type { EvalCriterion, EvalInput, EvalResult, Judge } from './types.js';
export declare class EvalRunner {
    private criteria;
    private judge?;
    private knownContentTypes;
    constructor(opts: {
        criteria: EvalCriterion[];
        judge?: Judge;
    });
    /** Get the set of content types recognized by registered criteria */
    getKnownContentTypes(): string[];
    /** Get criteria that apply to a given content type */
    getCriteria(contentType: string): EvalCriterion[];
    private validateContentType;
    /** Resolve the full set of criteria for an input (registered + inline rubrics) */
    private resolveCriteria;
    /** Run full evaluation (deterministic + LLM judge criteria) */
    evaluate(input: EvalInput): Promise<EvalResult>;
    /** Run only deterministic checks (no API calls) */
    quickCheck(input: EvalInput): Promise<EvalResult>;
    private buildResult;
    private buildFeedback;
}
//# sourceMappingURL=runner.d.ts.map