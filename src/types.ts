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
  failedCriteria: { criterion: string; reasoning: string; suggestions: string[] }[];
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

/** LLM judge interface — abstracts the model call */
export interface Judge {
  score: (
    content: string,
    rubric: JudgeRubric,
    context?: string,
  ) => Promise<{ score: number; reasoning: string; suggestions?: string[] }>;
}

/** Rubric for LLM-as-judge scoring */
export interface JudgeRubric {
  criterion: string;
  description: string;
  scale: { score: number; label: string; description: string }[];
}
