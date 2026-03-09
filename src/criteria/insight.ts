import type { EvalCriterion, EvalInput, EvalScore, Judge, JudgeRubric } from '../types.js';

const accuracyRubric: JudgeRubric = {
  criterion: 'Accuracy',
  description:
    'Is the skill breakdown accurate? Are the identified skills, technologies, and requirements correctly interpreted from the job posting context?',
  scale: [
    { score: 1, label: 'Inaccurate', description: 'Misidentifies skills or makes incorrect claims about requirements' },
    { score: 2, label: 'Partially accurate', description: 'Some correct skills but significant misreadings or omissions' },
    { score: 3, label: 'Accurate', description: 'Correctly identifies most key skills and requirements' },
    { score: 4, label: 'Thorough', description: 'Accurate identification with good categorization and prioritization' },
    { score: 5, label: 'Expert-level', description: 'Precise skill extraction with nuanced understanding of role requirements and industry context' },
  ],
};

export const accuracy: EvalCriterion = {
  name: 'accuracy',
  description: 'Skill breakdown accurately reflects job requirements',
  contentTypes: ['insight'],
  method: 'llm_judge',
  threshold: 0.5,
  weight: 1.5,
  async evaluate(input: EvalInput, judge?: Judge): Promise<EvalScore> {
    if (!judge) throw new Error('Judge required for accuracy criterion');
    const context = input.topic ? `Job posting context: ${input.topic}` : undefined;
    const result = await judge.score(input.content, accuracyRubric, context);
    const score = (result.score - 1) / 4;
    return {
      criterion: 'accuracy',
      score,
      rawScore: result.score,
      maxScore: 5,
      passed: score >= this.threshold,
      reasoning: result.reasoning,
      suggestions: result.suggestions ?? [],
    };
  },
};

const insightActionabilityRubric: JudgeRubric = {
  criterion: 'Actionability',
  description:
    'Does the insight provide concrete learning paths or next steps? Does it tell the reader what to study, practice, or build to close skill gaps?',
  scale: [
    { score: 1, label: 'No actions', description: 'Lists skills without guidance on how to acquire them' },
    { score: 2, label: 'Vague', description: 'Generic advice like "learn more about X" without specifics' },
    { score: 3, label: 'Some actions', description: 'Provides at least a few concrete learning suggestions' },
    { score: 4, label: 'Actionable', description: 'Clear learning paths with specific resources, projects, or practice areas' },
    { score: 5, label: 'Roadmap', description: 'Prioritized learning plan with specific milestones and measurable outcomes' },
  ],
};

export const insightActionability: EvalCriterion = {
  name: 'insight_actionability',
  description: 'Insight provides concrete learning paths to close skill gaps',
  contentTypes: ['insight'],
  method: 'llm_judge',
  threshold: 0.5,
  weight: 1.0,
  async evaluate(input: EvalInput, judge?: Judge): Promise<EvalScore> {
    if (!judge) throw new Error('Judge required for insight_actionability criterion');
    const result = await judge.score(input.content, insightActionabilityRubric);
    const score = (result.score - 1) / 4;
    return {
      criterion: 'insight_actionability',
      score,
      rawScore: result.score,
      maxScore: 5,
      passed: score >= this.threshold,
      reasoning: result.reasoning,
      suggestions: result.suggestions ?? [],
    };
  },
};

const depthRubric: JudgeRubric = {
  criterion: 'Depth',
  description:
    'Does the analysis go beyond surface-level skill listing? Does it explain why skills matter for the role, how they connect, and what level of proficiency is expected?',
  scale: [
    { score: 1, label: 'Shallow', description: 'Just a flat list of skills with no analysis' },
    { score: 2, label: 'Surface-level', description: 'Names skills and categories but lacks explanation of context or importance' },
    { score: 3, label: 'Adequate', description: 'Explains why key skills matter and provides some role context' },
    { score: 4, label: 'Deep', description: 'Analyzes skill relationships, expected proficiency levels, and role-specific context' },
    { score: 5, label: 'Expert analysis', description: 'Comprehensive breakdown with industry context, skill interdependencies, and strategic prioritization' },
  ],
};

export const depth: EvalCriterion = {
  name: 'depth',
  description: 'Analysis goes beyond surface-level skill listing',
  contentTypes: ['insight'],
  method: 'llm_judge',
  threshold: 0.5,
  weight: 1.0,
  async evaluate(input: EvalInput, judge?: Judge): Promise<EvalScore> {
    if (!judge) throw new Error('Judge required for depth criterion');
    const result = await judge.score(input.content, depthRubric);
    const score = (result.score - 1) / 4;
    return {
      criterion: 'depth',
      score,
      rawScore: result.score,
      maxScore: 5,
      passed: score >= this.threshold,
      reasoning: result.reasoning,
      suggestions: result.suggestions ?? [],
    };
  },
};

export const insight: EvalCriterion[] = [accuracy, insightActionability, depth];
