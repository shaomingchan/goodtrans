/**
 * GoodTrans 5-Round Translation Engine
 * Based on Make workflow: Extract → Optimize → Translate → Reflect → Finalize
 */

import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.AI_302_API_KEY || '',
  baseURL: 'https://api.302.ai/v1',
});

export interface TranslationSegment {
  original: string;
  translated: string;
  glossary: string[];
}

export interface TranslationResult {
  segments: TranslationSegment[];
  quality_score: number;
  glossary_used: string[];
}

/**
 * Round 2: Format Optimization (Markdown cleanup)
 */
export async function optimizeFormat(markdown: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Clean up this Markdown text. Remove headers/footers, standardize formatting. Keep content structure intact.

${markdown}`,
      },
    ],
  });

  return response.choices[0]?.message?.content || '';
}

/**
 * Round 3: Translation Draft (Sonnet)
 */
export async function translateDraft(
  text: string,
  targetLang: string,
  glossary: string
): Promise<string> {
  const response = await client.chat.completions.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: `Translate to ${targetLang}. Follow 信达雅 standard. Use this glossary:

${glossary}

Text:
${text}`,
      },
    ],
  });

  return response.choices[0]?.message?.content || '';
}

/**
 * Round 4: Translation Reflection (Opus)
 */
export async function reflectTranslation(
  original: string,
  draft: string,
  targetLang: string,
  glossary: string
): Promise<string> {
  const response = await client.chat.completions.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Review this translation. Find issues (信达雅 standard). Suggest improvements.

Original: ${original}
Draft: ${draft}
Target: ${targetLang}
Glossary: ${glossary}

Output improvement suggestions only.`,
      },
    ],
  });

  return response.choices[0]?.message?.content || '';
}

/**
 * Round 5: Final Translation (Opus)
 */
export async function finalize(
  original: string,
  draft: string,
  reflection: string,
  targetLang: string,
  glossary: string
): Promise<string> {
  const response = await client.chat.completions.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: `Apply improvements to produce final translation.

Original: ${original}
Draft: ${draft}
Improvements: ${reflection}
Target: ${targetLang}
Glossary: ${glossary}

Output final translation only.`,
      },
    ],
  });

  return response.choices[0]?.message?.content || '';
}

/**
 * Segment text (2000 chars + 100 overlap)
 */
export function segmentText(text: string, size = 2000, overlap = 100): string[] {
  const segments: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    segments.push(text.slice(start, end));
    start = end - overlap;
  }

  return segments;
}

/**
 * Full 5-round translation pipeline
 */
export async function translate5Rounds(
  text: string,
  targetLang: string,
  glossary: string
): Promise<TranslationResult> {
  // Round 2: Optimize
  const optimized = await optimizeFormat(text);

  // Segment
  const segments = segmentText(optimized);
  const results: TranslationSegment[] = [];

  // Process segments with concurrency limit of 3
  const CONCURRENCY = 3;
  for (let i = 0; i < segments.length; i += CONCURRENCY) {
    const batch = segments.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (segment) => {
        const draft = await translateDraft(segment, targetLang, glossary);
        const reflection = await reflectTranslation(segment, draft, targetLang, glossary);
        const final = await finalize(segment, draft, reflection, targetLang, glossary);
        return {
          original: segment,
          translated: final,
          glossary: [],
        };
      })
    );
    results.push(...batchResults);
  }

  return {
    segments: results,
    quality_score: 0,
    glossary_used: [],
  };
}
