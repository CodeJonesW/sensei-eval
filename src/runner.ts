import type { EvalCriterion, EvalFeedback, EvalInput, EvalResult, EvalScore, Judge } from './types.js';

export class EvalRunner {
  private criteria: EvalCriterion[];
  private judge?: Judge;
  private knownContentTypes: Set<string>;

  constructor(opts: { criteria: EvalCriterion[]; judge?: Judge }) {
    this.criteria = opts.criteria;
    this.judge = opts.judge;
    this.knownContentTypes = new Set(
      opts.criteria
        .flatMap((c) => (c.contentTypes === '*' ? [] : c.contentTypes)),
    );
  }

  /** Get the set of content types recognized by registered criteria */
  getKnownContentTypes(): string[] {
    return [...this.knownContentTypes].sort();
  }

  /** Get criteria that apply to a given content type */
  getCriteria(contentType: string): EvalCriterion[] {
    this.validateContentType(contentType);
    return this.criteria.filter(
      (c) => c.contentTypes === '*' || c.contentTypes.includes(contentType),
    );
  }

  private validateContentType(contentType: string): void {
    if (this.knownContentTypes.size > 0 && !this.knownContentTypes.has(contentType)) {
      const known = [...this.knownContentTypes].sort().join(', ');
      throw new Error(
        `Unknown content type "${contentType}". Known types: ${known}`,
      );
    }
  }

  /** Run full evaluation (deterministic + LLM judge criteria) */
  async evaluate(input: EvalInput): Promise<EvalResult> {
    const applicable = this.getCriteria(input.contentType);

    const deterministic = applicable.filter((c) => c.method === 'deterministic');
    const llm = applicable.filter((c) => c.method === 'llm_judge');

    // Run deterministic criteria first (fast, parallel)
    const detScores = await Promise.all(
      deterministic.map((c) => c.evaluate(input)),
    );

    // Run LLM judge criteria (parallel, requires judge)
    const llmScores = await Promise.all(
      llm.map((c) => {
        if (!this.judge) {
          throw new Error(
            `LLM judge required for criterion "${c.name}" but none provided`,
          );
        }
        return c.evaluate(input, this.judge);
      }),
    );

    const scores = [...detScores, ...llmScores];
    return this.buildResult(scores, applicable, input.contentType);
  }

  /** Run only deterministic checks (no API calls) */
  async quickCheck(input: EvalInput): Promise<EvalResult> {
    const applicable = this.getCriteria(input.contentType).filter(
      (c) => c.method === 'deterministic',
    );

    const scores = await Promise.all(
      applicable.map((c) => c.evaluate(input)),
    );

    return this.buildResult(scores, applicable, input.contentType);
  }

  private buildResult(
    scores: EvalScore[],
    applicable: EvalCriterion[],
    contentType: string,
  ): EvalResult {
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
    const optionalNames = new Set(
      applicable.filter((c) => c.optional).map((c) => c.name),
    );
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

  private buildFeedback(
    scores: EvalScore[],
    applicable: EvalCriterion[],
  ): EvalFeedback {
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
