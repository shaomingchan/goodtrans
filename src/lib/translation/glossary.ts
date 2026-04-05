/**
 * Glossary extraction and management
 */

import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.AI_302_API_KEY || '',
  baseURL: 'https://api.302.ai/v1',
});

export interface GlossaryTerm {
  source: string;
  target: string;
  context?: string;
}

/**
 * Extract terminology from text using Opus
 */
export async function extractTerms(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<GlossaryTerm[]> {
  const response = await client.chat.completions.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Extract technical terms, proper nouns, and domain-specific terminology from this ${sourceLang} text. Output as JSON array: [{"source": "term", "target": "${targetLang} translation"}]

${text.slice(0, 5000)}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content || '[]';
  try {
    return JSON.parse(content);
  } catch {
    return [];
  }
}

/**
 * Format glossary for prompt injection
 */
export function formatGlossary(terms: GlossaryTerm[]): string {
  if (terms.length === 0) return 'No glossary provided.';
  
  return terms.map(t => `${t.source} → ${t.target}`).join('\n');
}
