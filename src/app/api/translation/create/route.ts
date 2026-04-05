/**
 * POST /api/translation/create
 * Create translation task
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { inngest } from '@/lib/inngest/client';
import { db } from '@/core/db';
import { translationTask } from '@/config/db/schema';
import { nanoid } from 'nanoid';
import { getAuth } from '@/core/auth';
import { enforceMinIntervalRateLimit } from '@/shared/lib/rate-limit';

const schema = z.object({
  sourceText: z.string(),
  sourceLang: z.string(),
  targetLang: z.string(),
  email: z.string().email(),
  userId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // Rate limit: 1 request per 10 seconds per user
  const rateLimited = enforceMinIntervalRateLimit(req, {
    intervalMs: 10000,
    keyPrefix: 'translation-create',
  });
  if (rateLimited) return rateLimited;

  // Auth check
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const taskId = nanoid();

    // Create DB record
    await db().insert(translationTask).values({
      id: taskId,
      userId: session.user.id,
      email: data.email,
      status: 'pending',
      sourceLang: data.sourceLang,
      targetLang: data.targetLang,
      sourceText: data.sourceText,
      currentRound: 0,
      totalRounds: 5,
    });

    // Trigger Inngest workflow
    await inngest.send({
      name: 'translation/start',
      data: {
        taskId,
        sourceText: data.sourceText,
        sourceLang: data.sourceLang,
        targetLang: data.targetLang,
        email: data.email,
      },
    });

    return NextResponse.json({
      taskId,
      status: 'pending',
      message: 'Translation started. You will receive an email when completed.',
    });
  } catch (error) {
    console.error('Translation create error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid request' },
      { status: 400 }
    );
  }
}
