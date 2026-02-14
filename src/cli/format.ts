import type { EvalResult, CompareResult } from '../types.js';

/** Format eval results for terminal output */
export function formatEvalText(results: Map<string, EvalResult>, verbose: boolean): string {
  const lines: string[] = [];

  for (const [name, result] of results) {
    const status = result.passed ? 'PASS' : 'FAIL';
    lines.push(`${status}  ${name}  (${(result.overallScore * 100).toFixed(1)}%)`);

    if (verbose) {
      for (const score of result.scores) {
        const mark = score.passed ? '  +' : '  -';
        lines.push(`${mark} ${score.criterion}: ${(score.score * 100).toFixed(1)}%`);
      }
    }
  }

  return lines.join('\n');
}

/** Format compare results for terminal output */
export function formatCompareText(result: CompareResult, verbose: boolean): string {
  const lines: string[] = [];
  const { summary } = result;

  lines.push(`Comparison: ${summary.total} prompts — ${summary.regressed} regressed, ${summary.improved} improved, ${summary.unchanged} unchanged, ${summary.new} new`);
  lines.push('');

  for (const p of result.prompts) {
    let tag: string;
    if (p.newPrompt) tag = 'NEW ';
    else if (p.regressed) tag = 'FAIL';
    else tag = 'PASS';

    const delta = p.baselineScore !== null ? ` (${formatDelta(p.delta)})` : '';
    lines.push(`${tag}  ${p.name}  ${(p.currentScore * 100).toFixed(1)}%${delta}`);

    if (verbose && p.criteriaDeltas.length > 0) {
      for (const d of p.criteriaDeltas) {
        lines.push(`       ${d.criterion}: ${(d.current * 100).toFixed(1)}% (${formatDelta(d.delta)})`);
      }
    }
  }

  lines.push('');
  lines.push(result.passed ? 'Result: PASSED' : 'Result: FAILED — regressions detected');

  return lines.join('\n');
}

/** Format compare results as markdown table */
export function formatCompareMarkdown(result: CompareResult): string {
  const lines: string[] = [];
  const { summary } = result;

  lines.push('## sensei-eval Results');
  lines.push('');
  lines.push(`**${summary.total}** prompts evaluated — **${summary.regressed}** regressed, **${summary.improved}** improved, **${summary.unchanged}** unchanged, **${summary.new}** new`);
  lines.push('');
  lines.push('| Prompt | Score | Baseline | Delta | Status |');
  lines.push('|--------|-------|----------|-------|--------|');

  for (const p of result.prompts) {
    const status = p.newPrompt ? 'New' : p.regressed ? 'Regressed' : 'OK';
    const baselineCol = p.baselineScore !== null ? `${(p.baselineScore * 100).toFixed(1)}%` : '—';
    const deltaCol = p.baselineScore !== null ? formatDelta(p.delta) : '—';
    lines.push(`| ${p.name} | ${(p.currentScore * 100).toFixed(1)}% | ${baselineCol} | ${deltaCol} | ${status} |`);
  }

  lines.push('');
  lines.push(result.passed ? '**Result: PASSED**' : '**Result: FAILED** — regressions detected');

  return lines.join('\n');
}

/** Format eval results as markdown */
export function formatEvalMarkdown(results: Map<string, EvalResult>): string {
  const lines: string[] = [];

  lines.push('## sensei-eval Results');
  lines.push('');
  lines.push('| Prompt | Score | Status |');
  lines.push('|--------|-------|--------|');

  for (const [name, result] of results) {
    const status = result.passed ? 'Pass' : 'Fail';
    lines.push(`| ${name} | ${(result.overallScore * 100).toFixed(1)}% | ${status} |`);
  }

  return lines.join('\n');
}

function formatDelta(delta: number): string {
  const pct = (delta * 100).toFixed(1);
  return delta >= 0 ? `+${pct}%` : `${pct}%`;
}
