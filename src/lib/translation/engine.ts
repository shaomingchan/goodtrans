/**
 * GoodTrans 5-Round Reflection Translation Engine
 *
 * Pipeline: [Glossary Extract] → Format Optimize → Translate Draft → Reflect → Finalize
 *
 * Based on the "翔宇工作流" Make workflow prompts, refined for
 * programmatic use with dynamic source/target language injection.
 */

import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.AI_302_API_KEY || '',
  baseURL: 'https://api.302.ai/v1',
});

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

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

interface Translate5RoundsOptions {
  onRoundChange?: (round: number) => Promise<void> | void;
  sourceLang?: string;
}

// ────────────────────────────────────────────────────────────────
// Round 2 — Format Optimization (only for file-extracted content)
// ────────────────────────────────────────────────────────────────

export async function optimizeFormat(markdown: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'system',
        content: `你是一位文本格式专家，负责将从文件中提取的原始文本清理为干净的 Markdown。

## 任务
1. 删除页眉、页脚、页码等冗余信息。
2. 修复断行、多余空格等 OCR / 提取伪影。
3. 将标题、列表、表格等结构转为标准 Markdown 语法。
4. 处理截断文本，确保逻辑连贯。

## 绝对禁止
- 不翻译、不改写、不总结任何内容。
- 不新增原文中不存在的标题、小标题或要点列表。
- 不添加开头语或结束语。

## 输出
仅输出清理后的 Markdown 文本，不要包裹在代码块中。`,
      },
      {
        role: 'user',
        content: markdown,
      },
    ],
  });

  return response.choices[0]?.message?.content || '';
}

// ────────────────────────────────────────────────────────────────
// Round 3 — Translation Draft (Sonnet)
// ────────────────────────────────────────────────────────────────

export async function translateDraft(
  text: string,
  sourceLang: string,
  targetLang: string,
  glossary: string
): Promise<string> {
  const response = await client.chat.completions.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [
      {
        role: 'system',
        content: `# Role: 资深跨语言翻译专家

你是一位精通${sourceLang}与${targetLang}的专业翻译，遵循严复"信、达、雅"理念。

## 翻译流程
1. **原文解析**：识别文本类型（技术 / 法律 / 文学 / 通用），理解上下文与作者意图。
2. **策略制定**：根据文本类型选择合适的翻译手法——技术文本强调准确，文学文本注重意境。
3. **初稿翻译**：
   - 参照术语表翻译专业术语，确保一致性。
   - 避免逐字直译，注重整体意义与自然表达。
   - 保持原文风格、语气与情感色彩。
   - 专有名词、人名保留原文形式。
   - 货币、日期、度量单位按目标语言习惯本地化。

## 约束
1. 仅依据原文翻译，不添加解释、注释或个人观点。
2. 译文体量与原文基本一致，不扩写不缩减。
3. 保持原文编号、分段与层次结构。
4. 不输出开头语或结尾语，只输出译文。

## 源语言：${sourceLang}
## 目标语言：${targetLang}

## 术语表
${glossary || '（无术语表）'}`,
      },
      {
        role: 'user',
        content: text,
      },
    ],
  });

  return response.choices[0]?.message?.content || '';
}

// ────────────────────────────────────────────────────────────────
// Round 4 — Translation Reflection (Opus)
// ────────────────────────────────────────────────────────────────

export async function reflectTranslation(
  original: string,
  draft: string,
  sourceLang: string,
  targetLang: string,
  glossary: string
): Promise<string> {
  // 动态建议条数：每 200 字符约 1 条建议，下限 3 条，上限 15 条
  const suggestedCount = Math.min(15, Math.max(3, Math.ceil(original.length / 200)));

  const response = await client.chat.completions.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'system',
        content: `# Role: 翻译评审专家

你是一位翻译质量评审专家，专注于用"信达雅"框架审校译文。

## 信达雅定义
- **信（Faithfulness）**：译文准确传达原文内容和意图，无添加、删减或歪曲。
- **达（Expressiveness）**：译文通顺流畅，符合${targetLang}表达习惯，易于理解。
- **雅（Elegance）**：译文语言优美得体，具有与原文匹配的文学性或专业美感。

## 评审流程
1. 逐句对照原文与翻译初稿。
2. 从"信"、"达"、"雅"三个维度识别问题。
3. 为每个问题提供改进前后的**完整语句**对比。

## 输出格式
请输出约 ${suggestedCount} 条改进建议，每条格式如下：

**问题 N（信/达/雅）**：[问题描述]
- 原译文：[初稿中的完整句子]
- 改进后：[修改后的完整句子]

## 约束
1. 只基于原文事实提出建议，禁止编造不存在的问题。
2. 每条建议必须给出具体的改进后译文，不可笼统说"建议优化"。
3. 如果初稿质量已经很高，可以少于 ${suggestedCount} 条，但不要凑数。
4. 不输出开头语或结尾语。

## 源语言：${sourceLang}
## 目标语言：${targetLang}
## 术语表：${glossary || '（无术语表）'}`,
      },
      {
        role: 'user',
        content: `原文：\n${original}\n\n翻译初稿：\n${draft}`,
      },
    ],
  });

  return response.choices[0]?.message?.content || '';
}

// ────────────────────────────────────────────────────────────────
// Round 5 — Final Translation (Opus)
// ────────────────────────────────────────────────────────────────

export async function finalize(
  original: string,
  draft: string,
  reflection: string,
  sourceLang: string,
  targetLang: string,
  glossary: string
): Promise<string> {
  const response = await client.chat.completions.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 8192,
    messages: [
      {
        role: 'system',
        content: `# Role: 翻译终稿专家

你是一位翻译定稿专家。你的唯一任务是：根据"翻译改进清单"逐条修改"翻译初稿"，生成终稿。

## 工作流程
1. 阅读原文、翻译初稿和改进清单，理解每条建议的意图。
2. 在初稿基础上，逐条应用清单中的修改建议。
3. 如果某条建议涉及的表达在初稿中多处出现，全局统一修改。
4. 对照术语表检查专业术语的准确性和一致性。
5. 最终通读，确保修改后的上下文连贯。

## 核心约束（最重要）
1. **只改清单里提到的。** 未被改进清单涉及的句子，保持初稿原文不变。
2. 不自行添加初稿和清单中都没有的修改。
3. 不添加任何开头语、结尾语、解释或注释。
4. 不使用代码块包裹输出。
5. 保持原文的段落结构和编号。

## 输出
仅输出完整的终稿译文。

## 源语言：${sourceLang}
## 目标语言：${targetLang}
## 术语表：${glossary || '（无术语表）'}`,
      },
      {
        role: 'user',
        content: `原文：\n${original}\n\n翻译初稿：\n${draft}\n\n翻译改进清单：\n${reflection}`,
      },
    ],
  });

  return response.choices[0]?.message?.content || '';
}

// ────────────────────────────────────────────────────────────────
// Text segmentation — split by sentence/paragraph boundaries
// ────────────────────────────────────────────────────────────────

/**
 * Split text into segments ≤ `maxSize` characters, preferring paragraph
 * and sentence boundaries over hard character cuts.
 */
export function segmentText(text: string, maxSize = 2000): string[] {
  // If text fits in one segment, return as-is
  if (text.length <= maxSize) return [text];

  const segments: string[] = [];
  // Split by double-newline (paragraph boundary) first
  const paragraphs = text.split(/\n\s*\n/);
  let current = '';

  for (const para of paragraphs) {
    const candidate = current ? current + '\n\n' + para : para;

    if (candidate.length <= maxSize) {
      current = candidate;
    } else if (current) {
      // Current buffer is full, push it
      segments.push(current.trim());
      // If single paragraph exceeds maxSize, split by sentences
      if (para.length > maxSize) {
        segments.push(...splitBySentence(para, maxSize));
        current = '';
      } else {
        current = para;
      }
    } else {
      // Single paragraph exceeds maxSize, split by sentences
      segments.push(...splitBySentence(para, maxSize));
      current = '';
    }
  }

  if (current.trim()) {
    segments.push(current.trim());
  }

  return segments;
}

/**
 * Split a single paragraph by sentence boundaries (。！？.!? etc.)
 */
function splitBySentence(text: string, maxSize: number): string[] {
  const segments: string[] = [];
  // Match sentence-ending punctuation (Chinese and English)
  const sentences = text.split(/(?<=[。！？.!?\n])\s*/);
  let current = '';

  for (const sentence of sentences) {
    const candidate = current + sentence;
    if (candidate.length <= maxSize) {
      current = candidate;
    } else if (current) {
      segments.push(current.trim());
      current = sentence;
    } else {
      // Single sentence exceeds maxSize — hard cut as last resort
      for (let i = 0; i < sentence.length; i += maxSize) {
        segments.push(sentence.slice(i, i + maxSize));
      }
      current = '';
    }
  }

  if (current.trim()) {
    segments.push(current.trim());
  }

  return segments;
}

// ────────────────────────────────────────────────────────────────
// Full 5-round translation pipeline
// ────────────────────────────────────────────────────────────────

export async function translate5Rounds(
  text: string,
  targetLang: string,
  glossary: string,
  options: Translate5RoundsOptions = {}
): Promise<TranslationResult> {
  const sourceLang = options.sourceLang || 'auto';

  // Round 2: only run format optimization for file-extracted content
  const looksLikeExtractedDoc =
    text.length > 500 && /#{1,6}\s|^\s*[-*]\s|\|\s*---/m.test(text);
  await options.onRoundChange?.(2);
  const optimized = looksLikeExtractedDoc ? await optimizeFormat(text) : text;

  // Segment by paragraph/sentence boundaries
  const segments = segmentText(optimized);
  const results: TranslationSegment[] = [];

  const CONCURRENCY = 3;
  for (let i = 0; i < segments.length; i += CONCURRENCY) {
    const batch = segments.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (segment) => {
        await options.onRoundChange?.(3);
        const draft = await translateDraft(segment, sourceLang, targetLang, glossary);

        await options.onRoundChange?.(4);
        const reflection = await reflectTranslation(
          segment,
          draft,
          sourceLang,
          targetLang,
          glossary
        );

        await options.onRoundChange?.(5);
        const final = await finalize(
          segment,
          draft,
          reflection,
          sourceLang,
          targetLang,
          glossary
        );

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
