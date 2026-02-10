const problemClarityRubric = {
    criterion: 'Problem Clarity',
    description: 'Is the problem statement unambiguous? Can the reader understand exactly what they need to build/solve?',
    scale: [
        { score: 1, label: 'Unclear', description: 'Vague or contradictory requirements, impossible to know what to build' },
        { score: 2, label: 'Ambiguous', description: 'General idea is clear but key details are missing or unclear' },
        { score: 3, label: 'Clear', description: 'Requirements are understandable, minor ambiguities acceptable' },
        { score: 4, label: 'Precise', description: 'Clear inputs, outputs, and constraints with examples' },
        { score: 5, label: 'Crystal clear', description: 'Unambiguous spec with examples, edge cases noted, nothing left to guess' },
    ],
};
export const problemClarity = {
    name: 'problem_clarity',
    description: 'Problem statement is unambiguous and complete',
    contentTypes: ['challenge'],
    method: 'llm_judge',
    threshold: 0.5,
    weight: 1.5,
    async evaluate(input, judge) {
        if (!judge)
            throw new Error('Judge required for problem_clarity criterion');
        const result = await judge.score(input.content, problemClarityRubric);
        const score = (result.score - 1) / 4;
        return {
            criterion: 'problem_clarity',
            score,
            rawScore: result.score,
            maxScore: 5,
            passed: score >= this.threshold,
            reasoning: result.reasoning,
        };
    },
};
const difficultyCalibrationsRubric = {
    criterion: 'Difficulty Calibration',
    description: 'Does the challenge match the expected difficulty level? Consider: concept complexity, number of steps, edge cases, and expected time to solve.',
    scale: [
        { score: 1, label: 'Way off', description: 'Trivial problem labeled hard, or impossible problem labeled easy' },
        { score: 2, label: 'Miscalibrated', description: 'Noticeably easier or harder than stated level' },
        { score: 3, label: 'Reasonable', description: 'Roughly matches the stated difficulty, minor miscalibration' },
        { score: 4, label: 'Well-calibrated', description: 'Difficulty matches expectations, appropriate scope' },
        { score: 5, label: 'Perfectly tuned', description: 'Exactly the right level of challenge for the stated difficulty' },
    ],
};
export const difficultyCalibration = {
    name: 'difficulty_calibration',
    description: 'Challenge matches the expected difficulty level',
    contentTypes: ['challenge'],
    method: 'llm_judge',
    threshold: 0.5,
    weight: 1.0,
    async evaluate(input, judge) {
        if (!judge)
            throw new Error('Judge required for difficulty_calibration criterion');
        const context = input.difficulty
            ? `Expected difficulty: ${input.difficulty}`
            : undefined;
        const result = await judge.score(input.content, difficultyCalibrationsRubric, context);
        const score = (result.score - 1) / 4;
        return {
            criterion: 'difficulty_calibration',
            score,
            rawScore: result.score,
            maxScore: 5,
            passed: score >= this.threshold,
            reasoning: result.reasoning,
        };
    },
};
const hintQualityRubric = {
    criterion: 'Hint Quality',
    description: 'Are hints provided? Are they progressive (nudge → more direct)? Do they help without giving away the answer?',
    scale: [
        { score: 1, label: 'No hints', description: 'No hints or guidance provided at all' },
        { score: 2, label: 'Weak hints', description: 'Hints exist but are too vague or give away the answer' },
        { score: 3, label: 'Adequate', description: 'Hints provide useful direction without spoiling the solution' },
        { score: 4, label: 'Good progression', description: 'Multiple hint levels from gentle nudge to more direct guidance' },
        { score: 5, label: 'Perfect scaffolding', description: 'Progressive hints that teach problem-solving strategy, not just the answer' },
    ],
};
export const hintQuality = {
    name: 'hint_quality',
    description: 'Hints are progressive and helpful without spoiling the solution',
    contentTypes: ['challenge'],
    method: 'llm_judge',
    threshold: 0.5,
    weight: 1.0,
    async evaluate(input, judge) {
        if (!judge)
            throw new Error('Judge required for hint_quality criterion');
        const result = await judge.score(input.content, hintQualityRubric);
        const score = (result.score - 1) / 4;
        return {
            criterion: 'hint_quality',
            score,
            rawScore: result.score,
            maxScore: 5,
            passed: score >= this.threshold,
            reasoning: result.reasoning,
        };
    },
};
const testabilityRubric = {
    criterion: 'Testability',
    description: 'Can the solution be verified? Are there clear expected outputs, test cases, or validation criteria?',
    scale: [
        { score: 1, label: 'Unverifiable', description: 'No way to know if a solution is correct' },
        { score: 2, label: 'Vaguely testable', description: 'General idea of correctness but no concrete checks' },
        { score: 3, label: 'Testable', description: 'Expected behavior is clear enough to verify manually' },
        { score: 4, label: 'Well-specified', description: 'Clear expected outputs or test cases provided' },
        { score: 5, label: 'Fully specified', description: 'Complete test cases with edge cases, ready to validate automatically' },
    ],
};
export const testability = {
    name: 'testability',
    description: 'Solution is verifiable with clear expected outputs',
    contentTypes: ['challenge'],
    method: 'llm_judge',
    threshold: 0.5,
    weight: 1.0,
    async evaluate(input, judge) {
        if (!judge)
            throw new Error('Judge required for testability criterion');
        const result = await judge.score(input.content, testabilityRubric);
        const score = (result.score - 1) / 4;
        return {
            criterion: 'testability',
            score,
            rawScore: result.score,
            maxScore: 5,
            passed: score >= this.threshold,
            reasoning: result.reasoning,
        };
    },
};
export const challenge = [
    problemClarity,
    difficultyCalibration,
    hintQuality,
    testability,
];
//# sourceMappingURL=challenge.js.map