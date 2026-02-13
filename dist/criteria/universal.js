import { hasUnclosedCodeBlocks, hasUnclosedBold, hasUnclosedItalic, hasCodeBlock, hasHeadings, hasSections, } from '../utils/markdown.js';
const DEFAULT_LENGTH_LIMITS = {
    lesson: { min: 500, max: 5000 },
    challenge: { min: 300, max: 4000 },
    quiz: { min: 200, max: 3000 },
    review: { min: 100, max: 2000 },
};
const DEFAULT_LIMIT = { min: 200, max: 5000 };
export const formatCompliance = {
    name: 'format_compliance',
    description: 'No unclosed code blocks, bold, or italic markers',
    contentTypes: '*',
    method: 'deterministic',
    threshold: 1.0,
    weight: 1.0,
    async evaluate(input) {
        const issues = [];
        if (hasUnclosedCodeBlocks(input.content))
            issues.push('unclosed code block');
        if (hasUnclosedBold(input.content))
            issues.push('unclosed bold marker');
        if (hasUnclosedItalic(input.content))
            issues.push('unclosed italic marker');
        const passed = issues.length === 0;
        const suggestions = issues.map((issue) => `Close the ${issue}`);
        return {
            criterion: 'format_compliance',
            score: passed ? 1.0 : 0.0,
            rawScore: passed ? 1 : 0,
            maxScore: 1,
            passed,
            reasoning: passed
                ? 'All markdown formatting is properly closed'
                : `Formatting issues: ${issues.join(', ')}`,
            suggestions,
        };
    },
};
export const lengthCompliance = {
    name: 'length_compliance',
    description: 'Content length within acceptable range for its type',
    contentTypes: '*',
    method: 'deterministic',
    threshold: 1.0,
    weight: 1.0,
    async evaluate(input) {
        const limits = input.metadata?.lengthLimits ??
            DEFAULT_LENGTH_LIMITS[input.contentType] ??
            DEFAULT_LIMIT;
        const len = input.content.length;
        const passed = len >= limits.min && len <= limits.max;
        let score = 1.0;
        const suggestions = [];
        if (len < limits.min) {
            score = Math.max(0, len / limits.min);
            suggestions.push(`Content is ${limits.min - len} chars short of the minimum — add more detail`);
        }
        else if (len > limits.max) {
            score = Math.max(0, 1 - (len - limits.max) / limits.max);
            suggestions.push(`Content is ${len - limits.max} chars over the maximum — trim to fit within ${limits.max} chars`);
        }
        return {
            criterion: 'length_compliance',
            score,
            rawScore: len,
            maxScore: limits.max,
            passed,
            reasoning: passed
                ? `Content length ${len} chars is within range [${limits.min}, ${limits.max}]`
                : `Content length ${len} chars is outside range [${limits.min}, ${limits.max}]`,
            suggestions,
            metadata: { charCount: len, min: limits.min, max: limits.max },
        };
    },
};
export const hasCodeBlockCriterion = {
    name: 'has_code_block',
    description: 'Content includes at least one fenced code block',
    contentTypes: ['lesson', 'challenge'],
    method: 'deterministic',
    threshold: 1.0,
    weight: 0.5,
    async evaluate(input) {
        const passed = hasCodeBlock(input.content);
        return {
            criterion: 'has_code_block',
            score: passed ? 1.0 : 0.0,
            rawScore: passed ? 1 : 0,
            maxScore: 1,
            passed,
            reasoning: passed
                ? 'Content contains at least one code block'
                : 'No code block found in content',
            suggestions: passed ? [] : ['Add at least one fenced code block'],
        };
    },
};
export const hasStructure = {
    name: 'has_structure',
    description: 'Content has headings and multiple sections',
    contentTypes: ['lesson', 'challenge'],
    method: 'deterministic',
    threshold: 1.0,
    weight: 0.5,
    async evaluate(input) {
        const headings = hasHeadings(input.content);
        const sections = hasSections(input.content);
        const score = headings && sections ? 1.0 : headings ? 0.5 : 0.0;
        const passed = score >= this.threshold;
        const suggestions = [];
        if (!headings)
            suggestions.push('Add markdown headings to organize the content');
        if (headings && !sections)
            suggestions.push('Split into multiple sections with distinct headings');
        return {
            criterion: 'has_structure',
            score,
            rawScore: score,
            maxScore: 1,
            passed,
            reasoning: headings
                ? sections
                    ? 'Content has headings and multiple sections'
                    : 'Content has headings but lacks clear section structure'
                : 'Content lacks markdown headings',
            suggestions,
        };
    },
};
const engagementRubric = {
    criterion: 'Engagement',
    description: 'Does the content hook the reader, maintain good pacing, and provide a satisfying closure?',
    scale: [
        { score: 1, label: 'Disengaging', description: 'Dry, monotone, no hook or closure' },
        { score: 2, label: 'Weak', description: 'Minimal effort at engagement, feels like a textbook dump' },
        { score: 3, label: 'Competent', description: 'Has a hook, reasonable pacing, wraps up adequately' },
        { score: 4, label: 'Engaging', description: 'Strong opening, good flow, motivating conclusion' },
        { score: 5, label: 'Exceptional', description: 'Immediately compelling, perfect pacing, leaves reader wanting more' },
    ],
};
export const engagement = {
    name: 'engagement',
    description: 'Content has a hook, good pacing, and satisfying closure',
    contentTypes: '*',
    method: 'llm_judge',
    threshold: 0.5,
    weight: 1.0,
    optional: true,
    async evaluate(input, judge) {
        if (!judge)
            throw new Error('Judge required for engagement criterion');
        const result = await judge.score(input.content, engagementRubric);
        const score = (result.score - 1) / 4; // normalize 1-5 → 0-1
        return {
            criterion: 'engagement',
            score,
            rawScore: result.score,
            maxScore: 5,
            passed: score >= this.threshold,
            reasoning: result.reasoning,
            suggestions: result.suggestions ?? [],
        };
    },
};
const repetitionRubric = {
    criterion: 'Repetition Avoidance',
    description: 'Does this content differ meaningfully from the previously delivered content? Consider topic overlap, structure reuse, and phrasing similarity.',
    scale: [
        { score: 1, label: 'Duplicate', description: 'Nearly identical to previous content' },
        { score: 2, label: 'High overlap', description: 'Same topic and structure, minor wording changes' },
        { score: 3, label: 'Adequate variation', description: 'Different angle or examples, some overlap is fine' },
        { score: 4, label: 'Distinct', description: 'Clearly different topic or approach' },
        { score: 5, label: 'Fully novel', description: 'No meaningful overlap with previous content' },
    ],
};
export const repetitionAvoidance = {
    name: 'repetition_avoidance',
    description: 'Content differs meaningfully from previously delivered content',
    contentTypes: '*',
    method: 'llm_judge',
    threshold: 0.5,
    weight: 1.0,
    optional: true,
    async evaluate(input, judge) {
        if (!judge)
            throw new Error('Judge required for repetition_avoidance criterion');
        if (!input.previousContent?.length) {
            return {
                criterion: 'repetition_avoidance',
                score: 1.0,
                rawScore: 5,
                maxScore: 5,
                passed: true,
                reasoning: 'No previous content to compare against',
                suggestions: [],
            };
        }
        const context = `## Previous Content\n${input.previousContent.map((c, i) => `### Previous #${i + 1}\n${c}`).join('\n\n')}`;
        const result = await judge.score(input.content, repetitionRubric, context);
        const score = (result.score - 1) / 4;
        return {
            criterion: 'repetition_avoidance',
            score,
            rawScore: result.score,
            maxScore: 5,
            passed: score >= this.threshold,
            reasoning: result.reasoning,
            suggestions: result.suggestions ?? [],
        };
    },
};
export const universal = [
    formatCompliance,
    lengthCompliance,
    hasCodeBlockCriterion,
    hasStructure,
    engagement,
    repetitionAvoidance,
];
//# sourceMappingURL=universal.js.map