/**
 * POST /api/translation/create
 * Create translation task
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { inngest } from '@/lib/inngest/client';
import { nanoid } from 'nanoid';

const schema = z.object({
  fileUrl: z.string().url(),
  sourceLang: z.string(),
  targetLang: z.string(),
  email: z.string().email(),
  userId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const taskId = nanoid();

    // Trigger Inngest workflow
    await inngest.send({
      name: 'translation/start',
      data: {
        taskId,
        ...data,
      },
    });

    return NextResponse.json({
      taskId,
      status: 'pending',
      estimatedTime: 3600,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
