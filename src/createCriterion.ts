import type { EvalCriterion, EvalInput, EvalScore } from './types.js';
import type { Transform } from './transforms.js';
import type { Assertion } from './assertions.js';

/** Declarative configuration for building deterministic criteria */
export interface CriterionConfig {
  name: string;
  description: string;
  contentTypes: string[] | '*';
  threshold?: number;
  weight?: number;
  optional?: boolean;
  transforms?: Transform[];
  assertions: Assertion[];
  mode?: 'all' | 'any';
}

/** Build an EvalCriterion from declarative config (transforms + assertions) */
export function createCriterion(config: CriterionConfig): EvalCriterion {
  const {
    name,
    description,
    contentTypes,
    threshold = 1.0,
    weight = 1.0,
    optional,
    transforms = [],
    assertions,
    mode = 'all',
  } = config;

  return {
    name,
    description,
    contentTypes,
    method: 'deterministic',
    threshold,
    weight,
    optional,
    async evaluate(input: EvalInput): Promise<EvalScore> {
      let content = input.content;
      for (const transform of transforms) {
        content = transform(content);
      }

      const results = assertions.map((assertion) => assertion(content));

      let score: number;
      if (results.length === 0) {
        score = 1;
      } else if (mode === 'any') {
        score = Math.max(...results.map((r) => r.score));
      } else {
        score = Math.min(...results.map((r) => r.score));
      }

      const passed = score >= threshold;

      const reasoning = results.length === 0
        ? 'No assertions to check'
        : results.map((r) => r.reasoning).join('; ');

      const suggestions = results
        .filter((r) => !r.passed)
        .map((r) => r.reasoning);

      return {
        criterion: name,
        score,
        rawScore: score,
        maxScore: 1,
        passed,
        reasoning,
        suggestions,
      };
    },
  };
}
