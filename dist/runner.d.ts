import type { EvalCriterion, EvalInput, EvalResult, Judge } from './types.js';
export declare class EvalRunner {
    private criteria;
    private judge?;
    constructor(opts: {
        criteria: EvalCriterion[];
        judge?: Judge;
    });
    /** Get criteria that apply to a given content type */
    getCriteria(contentType: string): EvalCriterion[];
    /** Run full evaluation (deterministic + LLM judge criteria) */
    evaluate(input: EvalInput): Promise<EvalResult>;
    /** Run only deterministic checks (no API calls) */
    quickCheck(input: EvalInput): Promise<EvalResult>;
    private buildResult;
}
//# sourceMappingURL=runner.d.ts.map