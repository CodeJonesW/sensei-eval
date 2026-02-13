import type { EvalCriterion, EvalInput, EvalScore, Judge, JudgeRubric } from '../types.js';

const topicAccuracyRubric: JudgeRubric = {
  criterion: 'Topic Accuracy',
  description: 'Does the content accurately cover the stated topic? Is the information correct and relevant?',
  scale: [
    { score: 1, label: 'Off-topic', description: 'Content does not address the stated topic' },
    { score: 2, label: 'Tangential', description: 'Loosely related but misses core concepts' },
    { score: 3, label: 'Accurate', description: 'Covers the topic correctly with minor gaps' },
    { score: 4, label: 'Thorough', description: 'Comprehensive coverage, accurate details' },
    { score: 5, label: 'Expert-level', description: 'Deep, nuanced, no factual issues, adds genuine insight' },
  ],
};

export const topicAccuracy: EvalCriterion = {
  name: 'topic_accuracy',
  description: 'Content accurately covers the stated topic',
  contentTypes: ['lesson'],
  method: 'llm_judge',
  threshold: 0.5,
  weight: 1.5,
  async evaluate(input: EvalInput, judge?: Judge): Promise<EvalScore> {
    if (!judge) throw new Error('Judge required for topic_accuracy criterion');
    const context = input.topic ? `Expected topic: ${input.topic}` : undefined;
    const result = await judge.score(input.content, topicAccuracyRubric, context);
    const score = (result.score - 1) / 4;
    return {
      criterion: 'topic_accuracy',
      score,
      rawScore: result.score,
      maxScore: 5,
      passed: score >= this.threshold,
      reasoning: result.reasoning,
      suggestions: result.suggestions ?? [],
    };
  },
};

const pedagogicalStructureRubric: JudgeRubric = {
  criterion: 'Pedagogical Structure',
  description:
    'Does the lesson follow good teaching structure? Look for: intuition building → concrete examples → hands-on practice → synthesis/takeaways.',
  scale: [
    { score: 1, label: 'No structure', description: 'Random facts dumped with no progression' },
    { score: 2, label: 'Weak structure', description: 'Some organization but missing key phases (e.g. no examples or no practice)' },
    { score: 3, label: 'Solid structure', description: 'Clear progression from concept to practice, covers main phases' },
    { score: 4, label: 'Strong pedagogy', description: 'Well-scaffolded with intuition, examples, practice, and synthesis' },
    { score: 5, label: 'Masterful', description: 'Perfect scaffolding, builds mental models, practice reinforces theory' },
  ],
};

export const pedagogicalStructure: EvalCriterion = {
  name: 'pedagogical_structure',
  description: 'Lesson follows intuition → examples → practice → synthesis',
  contentTypes: ['lesson'],
  method: 'llm_judge',
  threshold: 0.5,
  weight: 1.5,
  async evaluate(input: EvalInput, judge?: Judge): Promise<EvalScore> {
    if (!judge) throw new Error('Judge required for pedagogical_structure criterion');
    const result = await judge.score(input.content, pedagogicalStructureRubric);
    const score = (result.score - 1) / 4;
    return {
      criterion: 'pedagogical_structure',
      score,
      rawScore: result.score,
      maxScore: 5,
      passed: score >= this.threshold,
      reasoning: result.reasoning,
      suggestions: result.suggestions ?? [],
    };
  },
};

const codeQualityRubric: JudgeRubric = {
  criterion: 'Code Quality',
  description:
    'Are the code examples relevant, likely to run correctly, and well-explained? Consider: relevance to topic, correctness, comments/explanations, and practical applicability.',
  scale: [
    { score: 1, label: 'Broken', description: 'Code has obvious errors or is irrelevant to the topic' },
    { score: 2, label: 'Weak', description: 'Code runs but is poorly explained or only loosely relevant' },
    { score: 3, label: 'Good', description: 'Relevant, likely correct code with adequate explanation' },
    { score: 4, label: 'Strong', description: 'Clean, well-commented code that directly reinforces the lesson' },
    { score: 5, label: 'Exemplary', description: 'Production-quality code, excellent comments, teaches through the code itself' },
  ],
};

export const codeQuality: EvalCriterion = {
  name: 'code_quality',
  description: 'Code examples are relevant, correct, and well-explained',
  contentTypes: ['lesson'],
  method: 'llm_judge',
  threshold: 0.5,
  weight: 1.0,
  async evaluate(input: EvalInput, judge?: Judge): Promise<EvalScore> {
    if (!judge) throw new Error('Judge required for code_quality criterion');
    const result = await judge.score(input.content, codeQualityRubric);
    const score = (result.score - 1) / 4;
    return {
      criterion: 'code_quality',
      score,
      rawScore: result.score,
      maxScore: 5,
      passed: score >= this.threshold,
      reasoning: result.reasoning,
      suggestions: result.suggestions ?? [],
    };
  },
};

const progressiveDifficultyRubric: JudgeRubric = {
  criterion: 'Progressive Difficulty',
  description:
    'Does the content build appropriately on prerequisites? Is the difficulty level well-calibrated for the stated level?',
  scale: [
    { score: 1, label: 'Mismatched', description: 'Far too easy or hard for the stated level, no scaffolding' },
    { score: 2, label: 'Poorly calibrated', description: 'Difficulty jumps around or assumes too much/little' },
    { score: 3, label: 'Appropriate', description: 'Matches stated difficulty, reasonable prerequisite assumptions' },
    { score: 4, label: 'Well-calibrated', description: 'Smooth difficulty curve, clear about prerequisites' },
    { score: 5, label: 'Perfect scaffolding', description: 'Masterfully builds from known to unknown at exactly the right pace' },
  ],
};

export const progressiveDifficulty: EvalCriterion = {
  name: 'progressive_difficulty',
  description: 'Content builds appropriately on prerequisites',
  contentTypes: ['lesson'],
  method: 'llm_judge',
  threshold: 0.5,
  weight: 1.0,
  async evaluate(input: EvalInput, judge?: Judge): Promise<EvalScore> {
    if (!judge) throw new Error('Judge required for progressive_difficulty criterion');
    const context = input.difficulty
      ? `Expected difficulty level: ${input.difficulty}`
      : undefined;
    const result = await judge.score(input.content, progressiveDifficultyRubric, context);
    const score = (result.score - 1) / 4;
    return {
      criterion: 'progressive_difficulty',
      score,
      rawScore: result.score,
      maxScore: 5,
      passed: score >= this.threshold,
      reasoning: result.reasoning,
      suggestions: result.suggestions ?? [],
    };
  },
};

export const lesson: EvalCriterion[] = [
  topicAccuracy,
  pedagogicalStructure,
  codeQuality,
  progressiveDifficulty,
];
