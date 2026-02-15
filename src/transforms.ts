/** A transform normalizes content before grading */
export type Transform = (content: string) => string;

/** Trim leading and trailing whitespace */
export function trim(): Transform {
  return (content) => content.trim();
}

/** Convert content to lowercase */
export function lowercase(): Transform {
  return (content) => content.toLowerCase();
}

/** Remove fenced code blocks (``` ... ```) */
export function stripCodeBlocks(): Transform {
  return (content) => content.replace(/^`{3,}[\s\S]*?^`{3,}/gm, '');
}

/** Extract text between start and end markers; returns original content if markers not found */
export function extractBetween(start: string, end: string): Transform {
  return (content) => {
    const startIdx = content.indexOf(start);
    if (startIdx === -1) return content;
    const afterStart = startIdx + start.length;
    const endIdx = content.indexOf(end, afterStart);
    if (endIdx === -1) return content;
    return content.slice(afterStart, endIdx);
  };
}

/** Compose transforms left-to-right */
export function pipe(...transforms: Transform[]): Transform {
  return (content) => transforms.reduce((acc, fn) => fn(acc), content);
}
