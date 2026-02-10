/** Check if all fenced code blocks are properly closed */
export declare function hasUnclosedCodeBlocks(content: string): boolean;
/** Check for unclosed bold markers (**) */
export declare function hasUnclosedBold(content: string): boolean;
/** Check for unclosed italic markers (*), excluding bold (**) */
export declare function hasUnclosedItalic(content: string): boolean;
/** Extract fenced code blocks from content */
export declare function extractCodeBlocks(content: string): string[];
/** Check if content has markdown headings */
export declare function hasHeadings(content: string): boolean;
/** Count the number of markdown headings */
export declare function countHeadings(content: string): number;
/** Check if content has multiple sections (2+ headings or separators) */
export declare function hasSections(content: string): boolean;
/** Check if content has at least one fenced code block */
export declare function hasCodeBlock(content: string): boolean;
//# sourceMappingURL=markdown.d.ts.map