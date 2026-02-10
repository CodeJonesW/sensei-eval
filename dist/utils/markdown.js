/** Count occurrences of a pattern in a string */
function countOccurrences(text, pattern) {
    let count = 0;
    let pos = 0;
    while ((pos = text.indexOf(pattern, pos)) !== -1) {
        count++;
        pos += pattern.length;
    }
    return count;
}
/** Check if all fenced code blocks are properly closed */
export function hasUnclosedCodeBlocks(content) {
    const fences = content.match(/^(`{3,})/gm) ?? [];
    return fences.length % 2 !== 0;
}
/** Strip fenced code blocks and inline code from content for formatting checks */
function stripCode(content) {
    // Remove fenced code blocks first
    let stripped = content.replace(/^`{3,}[\s\S]*?^`{3,}/gm, '');
    // Remove inline code
    stripped = stripped.replace(/`[^`]+`/g, '');
    return stripped;
}
/** Check for unclosed bold markers (**) */
export function hasUnclosedBold(content) {
    const count = countOccurrences(stripCode(content), '**');
    return count % 2 !== 0;
}
/** Check for unclosed italic markers (*), excluding bold (**) */
export function hasUnclosedItalic(content) {
    const stripped = stripCode(content);
    // Remove bold markers first, then check remaining single asterisks
    const withoutBold = stripped.replace(/\*\*/g, '');
    const count = countOccurrences(withoutBold, '*');
    return count % 2 !== 0;
}
/** Extract fenced code blocks from content */
export function extractCodeBlocks(content) {
    const blocks = [];
    const regex = /^(`{3,})(\w*)\n([\s\S]*?)^\1/gm;
    let match;
    while ((match = regex.exec(content)) !== null) {
        blocks.push(match[3]);
    }
    return blocks;
}
/** Check if content has markdown headings */
export function hasHeadings(content) {
    return /^#{1,6}\s+\S/m.test(content);
}
/** Count the number of markdown headings */
export function countHeadings(content) {
    const matches = content.match(/^#{1,6}\s+\S/gm);
    return matches?.length ?? 0;
}
/** Check if content has multiple sections (2+ headings or separators) */
export function hasSections(content) {
    const headingCount = countHeadings(content);
    if (headingCount >= 2)
        return true;
    // Also check for horizontal rules as section separators
    const hrCount = (content.match(/^(-{3,}|\*{3,}|_{3,})$/gm) ?? []).length;
    return headingCount + hrCount >= 2;
}
/** Check if content has at least one fenced code block */
export function hasCodeBlock(content) {
    return /^`{3,}/m.test(content) && !hasUnclosedCodeBlocks(content);
}
//# sourceMappingURL=markdown.js.map