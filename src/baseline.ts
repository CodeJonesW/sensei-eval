import type {
  EvalResult,
  BaselineEntry,
  BaselineFile,
  CompareResult,
  PromptCompareResult,
} from './types.js';

/** Extract a BaselineEntry from an evaluation result */
export function toBaselineEntry(name: string, result: EvalResult): BaselineEntry {
  const scores: Record<string, number> = {};
  for (const s of result.scores) {
    scores[s.criterion] = s.score;
  }
  return {
    name,
    contentType: result.contentType,
    overallScore: result.overallScore,
    scores,
    evaluatedAt: result.evaluatedAt,
  };
}

/** Create a full BaselineFile from entries */
export function createBaseline(
  entries: BaselineEntry[],
  mode: 'full' | 'quick',
): BaselineFile {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    mode,
    entries,
  };
}

/** Compare current evaluation results against a committed baseline */
export function compareResults(
  current: Map<string, EvalResult>,
  baseline: BaselineFile,
  threshold = 0,
): CompareResult {
  const baselineMap = new Map<string, BaselineEntry>();
  for (const entry of baseline.entries) {
    baselineMap.set(entry.name, entry);
  }

  const prompts: PromptCompareResult[] = [];
  let regressed = 0;
  let improved = 0;
  let unchanged = 0;
  let newCount = 0;
  let criterionRegressionCount = 0;

  for (const [name, result] of current) {
    const base = baselineMap.get(name);
    const currentScore = result.overallScore;
    const baselineScore = base?.overallScore ?? null;
    const delta = baselineScore !== null ? currentScore - baselineScore : 0;
    const isNew = base === undefined;

    const criteriaDeltas: PromptCompareResult['criteriaDeltas'] = [];
    const currentCriteriaNames = new Set(result.scores.map((s) => s.criterion));
    if (base) {
      const allCriteria = new Set([
        ...Object.keys(base.scores),
        ...result.scores.map((s) => s.criterion),
      ]);
      for (const criterion of allCriteria) {
        const currentCriterionScore =
          result.scores.find((s) => s.criterion === criterion)?.score ?? 0;
        const baselineCriterionScore = base.scores[criterion] ?? 0;
        criteriaDeltas.push({
          criterion,
          current: currentCriterionScore,
          baseline: baselineCriterionScore,
          delta: currentCriterionScore - baselineCriterionScore,
        });
      }
    }

    // Only count criterion regressions for criteria that were actually evaluated
    // in the current run. Criteria only in the baseline (e.g. LLM criteria during
    // a quick run) should not trigger false regressions.
    const evaluatedDeltas = criteriaDeltas.filter((d) => currentCriteriaNames.has(d.criterion));
    const hasCriterionRegression = evaluatedDeltas.some((d) => d.delta < -threshold);
    const isRegressed = !isNew && (delta < -threshold || hasCriterionRegression);

    if (hasCriterionRegression) {
      criterionRegressionCount += evaluatedDeltas.filter((d) => d.delta < -threshold).length;
    }

    if (isNew) newCount++;
    else if (isRegressed) regressed++;
    else if (delta > threshold) improved++;
    else unchanged++;

    prompts.push({
      name,
      contentType: result.contentType,
      currentScore,
      baselineScore,
      delta,
      regressed: isRegressed,
      newPrompt: isNew,
      criteriaDeltas,
    });
  }

  return {
    passed: regressed === 0,
    prompts,
    summary: {
      total: prompts.length,
      regressed,
      improved,
      unchanged,
      new: newCount,
      criterionRegressions: criterionRegressionCount,
    },
  };
}
