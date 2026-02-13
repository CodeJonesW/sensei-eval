import Anthropic from '@anthropic-ai/sdk';
const JUDGE_SYSTEM_PROMPT = `You are an expert evaluator of educational content. You score content against a specific rubric criterion.

Scoring calibration:
- 1/5: Fundamentally broken or missing
- 2/5: Present but poor quality, major issues
- 3/5: Competent and functional — this is the baseline for acceptable content
- 4/5: Strong quality, minor issues only
- 5/5: Exceptional — reserve this for truly outstanding content

Do NOT inflate scores. A 3/5 is a positive assessment meaning "this works well." Most good content should score 3 or 4.

You MUST respond with ONLY a JSON object in this exact format, no other text:
{"score": <number>, "reasoning": "<brief explanation>", "suggestions": ["<actionable suggestion>", ...]}

For scores of 4-5, return an empty suggestions array. For scores of 1-3, provide 1-3 specific, actionable suggestions for improvement.`;
export function createJudge(opts) {
    const client = new Anthropic({ apiKey: opts.apiKey });
    const model = opts.model ?? 'claude-sonnet-4-20250514';
    const maxTokens = opts.maxTokens ?? 750;
    return {
        async score(content, rubric, context) {
            const scaleDescription = rubric.scale
                .map((s) => `${s.score} — ${s.label}: ${s.description}`)
                .join('\n');
            const userPrompt = [
                `## Criterion: ${rubric.criterion}`,
                rubric.description,
                '',
                `## Scoring Scale`,
                scaleDescription,
                '',
                context ? `## Additional Context\n${context}\n` : '',
                `## Content to Evaluate`,
                content,
                '',
                `Score this content on the criterion above. Respond with ONLY a JSON object: {"score": <number>, "reasoning": "<brief explanation>", "suggestions": ["<actionable suggestion>", ...]}`,
            ]
                .filter(Boolean)
                .join('\n');
            const response = await client.messages.create({
                model,
                max_tokens: maxTokens,
                system: JUDGE_SYSTEM_PROMPT,
                messages: [{ role: 'user', content: userPrompt }],
            });
            const text = response.content[0].type === 'text' ? response.content[0].text : '';
            const parsed = JSON.parse(text);
            if (typeof parsed.score !== 'number' ||
                typeof parsed.reasoning !== 'string') {
                throw new Error(`Invalid judge response: ${text}`);
            }
            const suggestions = Array.isArray(parsed.suggestions)
                ? parsed.suggestions.filter((s) => typeof s === 'string')
                : [];
            return { score: parsed.score, reasoning: parsed.reasoning, suggestions };
        },
    };
}
//# sourceMappingURL=judge.js.map