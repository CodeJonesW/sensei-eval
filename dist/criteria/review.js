const DEFAULT_REVIEW_MAX_CHARS = 2000;
export const brevity = {
    name: 'brevity',
    description: 'Review content is concise and under character budget',
    contentTypes: ['review'],
    method: 'deterministic',
    threshold: 1.0,
    weight: 0.5,
    async evaluate(input) {
        const maxChars = input.metadata?.maxReviewChars ?? DEFAULT_REVIEW_MAX_CHARS;
        const len = input.content.length;
        const passed = len <= maxChars;
        const score = passed ? 1.0 : Math.max(0, 1 - (len - maxChars) / maxChars);
        return {
            criterion: 'brevity',
            score,
            rawScore: len,
            maxScore: maxChars,
            passed,
            reasoning: passed
                ? `Review is ${len} chars, within ${maxChars} char budget`
                : `Review is ${len} chars, exceeds ${maxChars} char budget`,
            suggestions: passed ? [] : [`Reduce by ${len - maxChars} chars to fit within ${maxChars} char budget`],
        };
    },
};
const actionabilityRubric = {
    criterion: 'Actionability',
    description: 'Does the review contain concrete, specific next steps the reader can take? Not vague encouragement but real actions.',
    scale: [
        { score: 1, label: 'No actions', description: 'Pure commentary with no next steps' },
        { score: 2, label: 'Vague', description: 'Generic advice like "keep practicing" without specifics' },
        { score: 3, label: 'Some actions', description: 'Contains at least one concrete next step' },
        { score: 4, label: 'Actionable', description: 'Multiple specific, prioritized next steps' },
        { score: 5, label: 'Highly actionable', description: 'Clear roadmap with prioritized, specific, measurable actions' },
    ],
};
export const actionability = {
    name: 'actionability',
    description: 'Review contains concrete next steps',
    contentTypes: ['review'],
    method: 'llm_judge',
    threshold: 0.5,
    weight: 1.0,
    async evaluate(input, judge) {
        if (!judge)
            throw new Error('Judge required for actionability criterion');
        const result = await judge.score(input.content, actionabilityRubric);
        const score = (result.score - 1) / 4;
        return {
            criterion: 'actionability',
            score,
            rawScore: result.score,
            maxScore: 5,
            passed: score >= this.threshold,
            reasoning: result.reasoning,
            suggestions: result.suggestions ?? [],
        };
    },
};
const honestyRubric = {
    criterion: 'Honesty',
    description: "Does the review honestly assess gaps and weaknesses? Does it avoid sugarcoating or false encouragement?",
    scale: [
        { score: 1, label: 'Dishonest', description: 'Pure cheerleading, ignores obvious gaps' },
        { score: 2, label: 'Sugarcoated', description: 'Acknowledges issues but softens them to the point of uselessness' },
        { score: 3, label: 'Balanced', description: 'Honest about strengths and weaknesses, constructive tone' },
        { score: 4, label: 'Direct', description: 'Clear-eyed assessment, names gaps specifically while remaining respectful' },
        { score: 5, label: 'Brutally honest', description: 'Unflinching but constructive, prioritizes gaps, no wasted praise' },
    ],
};
export const honesty = {
    name: 'honesty',
    description: "Review honestly assesses gaps without sugarcoating",
    contentTypes: ['review'],
    method: 'llm_judge',
    threshold: 0.5,
    weight: 1.0,
    async evaluate(input, judge) {
        if (!judge)
            throw new Error('Judge required for honesty criterion');
        const result = await judge.score(input.content, honestyRubric);
        const score = (result.score - 1) / 4;
        return {
            criterion: 'honesty',
            score,
            rawScore: result.score,
            maxScore: 5,
            passed: score >= this.threshold,
            reasoning: result.reasoning,
            suggestions: result.suggestions ?? [],
        };
    },
};
export const review = [brevity, actionability, honesty];
//# sourceMappingURL=review.js.map