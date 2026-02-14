import { readFileSync } from 'node:fs';
import type { SenseiEvalConfig } from './src/types.js';

const fixture = (name: string) =>
  readFileSync(new URL(`tests/fixtures/${name}`, import.meta.url), 'utf-8');

const config: SenseiEvalConfig = {
  prompts: [
    {
      name: 'neural-networks-lesson',
      content: fixture('good-lesson.md'),
      contentType: 'lesson',
      topic: 'Neural Networks',
      difficulty: 'intermediate',
    },
    {
      name: 'lru-cache-challenge',
      content: fixture('good-challenge.md'),
      contentType: 'challenge',
      topic: 'LRU Cache',
      difficulty: 'intermediate',
    },
    {
      name: 'binary-search-review',
      content: fixture('good-review.md'),
      contentType: 'review',
    },
    {
      name: 'closures-lesson',
      content: fixture('mediocre-lesson.md'),
      contentType: 'lesson',
      topic: 'JavaScript Closures',
      difficulty: 'beginner',
    },
  ],
};

export default config;
