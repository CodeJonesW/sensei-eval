import type { EvalCriterion, EvalInput, EvalScore, Judge, JudgeRubric } from '../types.js';

const relevanceRubric: JudgeRubric = {
  criterion: 'Relevance',
  description:
    "Does the job application content directly address the target role's requirements? Does it connect the candidate's skills to what the job posting asks for?",
  scale: [
    { score: 1, label: 'Irrelevant', description: 'Generic content that ignores the specific role requirements' },
    { score: 2, label: 'Loosely relevant', description: 'Mentions the role but fails to connect candidate skills to requirements' },
    { score: 3, label: 'Relevant', description: 'Addresses key requirements and maps some candidate skills to them' },
    { score: 4, label: 'Targeted', description: 'Directly addresses most requirements with specific skill matches and evidence' },
    { score: 5, label: 'Laser-focused', description: 'Every point ties candidate experience to a specific job requirement with concrete evidence' },
  ],
};

export const relevance: EvalCriterion = {
  name: 'relevance',
  description: 'Content directly addresses the target role requirements',
  contentTypes: ['job'],
  method: 'llm_judge',
  threshold: 0.5,
  weight: 1.5,
  async evaluate(input: EvalInput, judge?: Judge): Promise<EvalScore> {
    if (!judge) throw new Error('Judge required for relevance criterion');
    const result = await judge.score(input.content, relevanceRubric);
    const score = (result.score - 1) / 4;
    return {
      criterion: 'relevance',
      score,
      rawScore: result.score,
      maxScore: 5,
      passed: score >= this.threshold,
      reasoning: result.reasoning,
      suggestions: result.suggestions ?? [],
    };
  },
};

const persuasivenessRubric: JudgeRubric = {
  criterion: 'Persuasiveness',
  description:
    'Is the content compelling? Does it make a strong case for the candidate rather than just listing facts? Consider tone, framing, and use of evidence.',
  scale: [
    { score: 1, label: 'Flat', description: 'Reads like a resume dump with no narrative or persuasion' },
    { score: 2, label: 'Weak', description: 'States qualifications but does not frame them compellingly' },
    { score: 3, label: 'Competent', description: 'Makes a reasonable case with some supporting evidence' },
    { score: 4, label: 'Persuasive', description: 'Compelling framing with concrete achievements and clear value proposition' },
    { score: 5, label: 'Exceptional', description: 'Immediately convincing — strong narrative, quantified impact, memorable positioning' },
  ],
};

export const persuasiveness: EvalCriterion = {
  name: 'persuasiveness',
  description: 'Content makes a compelling case for the candidate',
  contentTypes: ['job'],
  method: 'llm_judge',
  threshold: 0.5,
  weight: 1.0,
  async evaluate(input: EvalInput, judge?: Judge): Promise<EvalScore> {
    if (!judge) throw new Error('Judge required for persuasiveness criterion');
    const result = await judge.score(input.content, persuasivenessRubric);
    const score = (result.score - 1) / 4;
    return {
      criterion: 'persuasiveness',
      score,
      rawScore: result.score,
      maxScore: 5,
      passed: score >= this.threshold,
      reasoning: result.reasoning,
      suggestions: result.suggestions ?? [],
    };
  },
};

const completenessRubric: JudgeRubric = {
  criterion: 'Completeness',
  description:
    'Does the content cover all essential elements for a job application? Consider: role match summary, key talking points, relevant experience highlights, and clear next steps or call to action.',
  scale: [
    { score: 1, label: 'Incomplete', description: 'Missing most essential elements' },
    { score: 2, label: 'Partial', description: 'Covers some elements but has significant gaps' },
    { score: 3, label: 'Adequate', description: 'Covers the basics — match summary, some talking points, and next steps' },
    { score: 4, label: 'Thorough', description: 'Covers all key elements with useful detail' },
    { score: 5, label: 'Comprehensive', description: 'Complete coverage with prioritized talking points, specific evidence, and actionable next steps' },
  ],
};

export const completeness: EvalCriterion = {
  name: 'completeness',
  description: 'Content covers all essential job application elements',
  contentTypes: ['job'],
  method: 'llm_judge',
  threshold: 0.5,
  weight: 1.0,
  async evaluate(input: EvalInput, judge?: Judge): Promise<EvalScore> {
    if (!judge) throw new Error('Judge required for completeness criterion');
    const result = await judge.score(input.content, completenessRubric);
    const score = (result.score - 1) / 4;
    return {
      criterion: 'completeness',
      score,
      rawScore: result.score,
      maxScore: 5,
      passed: score >= this.threshold,
      reasoning: result.reasoning,
      suggestions: result.suggestions ?? [],
    };
  },
};

export const job: EvalCriterion[] = [relevance, persuasiveness, completeness];
