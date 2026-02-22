import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

interface TranslateRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  format?: 'markdown' | 'pdf';
}

export async function POST(request: NextRequest) {
  try {
    const body: TranslateRequest = await request.json();
    const { text, sourceLanguage, targetLanguage, format = 'markdown' } = body;

    if (!text || !sourceLanguage || !targetLanguage) {
      return NextResponse.json(
        { error: 'Missing required fields: text, sourceLanguage, targetLanguage' },
        { status: 400 }
      );
    }

    const charCount = text.length;

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Translate the following text from ${sourceLanguage} to ${targetLanguage}. 
          
Maintain the original formatting and structure. If the text contains markdown, preserve the markdown syntax.

Text to translate:
${text}

Provide only the translated text without any additional commentary.`,
        },
      ],
    });

    const translatedText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    return NextResponse.json({
      success: true,
      original: text,
      translated: translatedText,
      sourceLanguage,
      targetLanguage,
      charCount,
      format,
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
