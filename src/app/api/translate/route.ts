import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const claudeClient = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

const qwenClient = new OpenAI({
  baseURL: 'https://coding.dashscope.aliyuncs.com/v1',
  apiKey: process.env.ALIYUN_API_KEY,
});

interface TranslateRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  format?: 'markdown' | 'pdf';
  model?: 'claude' | 'qwen3.5-plus' | 'qwen3-coder-plus';
}

const MODELS = {
  claude: {
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    id: 'claude-3-5-sonnet-20241022',
  },
  'qwen3.5-plus': {
    name: 'Qwen3.5 Plus',
    provider: 'aliyun',
    id: 'qwen3.5-plus',
  },
  'qwen3-coder-plus': {
    name: 'Qwen3 Coder Plus',
    provider: 'aliyun',
    id: 'qwen3-coder-plus',
  },
};

export async function POST(request: NextRequest) {
  try {
    const body: TranslateRequest = await request.json();
    const {
      text,
      sourceLanguage,
      targetLanguage,
      format = 'markdown',
      model = 'claude',
    } = body;

    if (!text || !sourceLanguage || !targetLanguage) {
      return NextResponse.json(
        { error: 'Missing required fields: text, sourceLanguage, targetLanguage' },
        { status: 400 }
      );
    }

    if (!MODELS[model as keyof typeof MODELS]) {
      return NextResponse.json(
        { error: `Invalid model: ${model}. Available: ${Object.keys(MODELS).join(', ')}` },
        { status: 400 }
      );
    }

    const charCount = text.length;
    const selectedModel = MODELS[model as keyof typeof MODELS];
    let translatedText = '';

    const systemPrompt = `You are a professional translator. Translate the following text from ${sourceLanguage} to ${targetLanguage}.

Maintain the original formatting and structure. If the text contains markdown, preserve the markdown syntax.

Provide only the translated text without any additional commentary.`;

    if (selectedModel.provider === 'anthropic') {
      const message = await claudeClient.messages.create({
        model: selectedModel.id,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: `${systemPrompt}\n\nText to translate:\n${text}`,
          },
        ],
      });
      translatedText =
        message.content[0].type === 'text' ? message.content[0].text : '';
    } else if (selectedModel.provider === 'aliyun') {
      const response = await qwenClient.chat.completions.create({
        model: selectedModel.id,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Text to translate:\n${text}`,
          },
        ],
        max_tokens: 4096,
      });
      translatedText =
        response.choices[0].message.content || '';
    }

    return NextResponse.json({
      success: true,
      original: text,
      translated: translatedText,
      sourceLanguage,
      targetLanguage,
      charCount,
      format,
      model: selectedModel.name,
      estimatedCost: (charCount * 0.00005).toFixed(6), // $0.05 per word
    });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Translation failed', details: String(error) },
      { status: 500 }
    );
  }
}
