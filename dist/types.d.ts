/** What the consumer provides for evaluation */
export interface EvalInput {
    content: string;
    contentType: string;
    topic?: string;
    difficulty?: string;
    previousContent?: string[];
    metadata?: Record<string, unknown>;
}
/** Definition of a single evaluation criterion */
export interface EvalCriterion {
    name: string;
    description: string;
    contentTypes: string[] | '*';
    method: 'deterministic' | 'llm_judge';
    threshold: number;
    weight: number;
    optional?: boolean;
    evaluate: (input: EvalInput, judge?: Judge) => Promise<EvalScore>;
}
/** Score for a single criterion */
export interface EvalScore {
    criterion: string;
    score: number;
    rawScore: number;
    maxScore: number;
    passed: boolean;
    reasoning: string;
    suggestions?: string[];
    metadata?: Record<string, unknown>;
}
/** Structured actionable feedback from evaluation */
export interface EvalFeedback {
    failedCriteria: {
        criterion: string;
        reasoning: string;
        suggestions: string[];
    }[];
    strengths: string[];
    suggestions: string[];
}
/** Full evaluation result */
export interface EvalResult {
    overallScore: number;
    passed: boolean;
    scores: EvalScore[];
    feedback: EvalFeedback;
    contentType: string;
    evaluatedAt: string;
}
/** A rubric can be a full structured rubric or a simple assertion string */
export type Rubric = JudgeRubric | string;
/** LLM judge interface — abstracts the model call */
export interface Judge {
    score: (content: string, rubric: Rubric, context?: string) => Promise<{
        score: number;
        reasoning: string;
        suggestions?: string[];
    }>;
}
/** Rubric for LLM-as-judge scoring */
export interface JudgeRubric {
    criterion: string;
    description: string;
    scale: {
        score: number;
        label: string;
        description: string;
    }[];
}
/** A prompt entry for CLI evaluation */
export interface PromptEntry {
    name: string;
    content: string;
    contentType: string;
    topic?: string;
    difficulty?: string;
    previousContent?: string[];
    metadata?: Record<string, unknown>;
}
/** Configuration for the sensei-eval CLI */
export interface SenseiEvalConfig {
    prompts: PromptEntry[];
    criteria?: EvalCriterion[];
    model?: string;
}
/** A single entry in a baseline file */
export interface BaselineEntry {
    name: string;
    contentType: string;
    overallScore: number;
    scores: Record<string, number>;
    evaluatedAt: string;
}
/** The committed baseline file format */
export interface BaselineFile {
    version: 1;
    generatedAt: string;
    mode: 'full' | 'quick';
    entries: BaselineEntry[];
}
/** Comparison result for a single prompt */
export interface PromptCompareResult {
    name: string;
    contentType: string;
    currentScore: number;
    baselineScore: number | null;
    delta: number;
    regressed: boolean;
    newPrompt: boolean;
    criteriaDeltas: {
        criterion: string;
        current: number;
        baseline: number;
        delta: number;
    }[];
}
/** Aggregate comparison result */
export interface CompareResult {
    passed: boolean;
    prompts: PromptCompareResult[];
    summary: {
        total: number;
        regressed: number;
        improved: number;
        unchanged: number;
        new: number;
        criterionRegressions: number;
    };
}
//# sourceMappingURL=types.d.ts.map