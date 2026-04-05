import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/core/db';
import { getAuth } from '@/core/auth';
import { translationTask } from '@/config/db/schema';

/**
 * Translation Task Status API
 * GET /api/translate/[taskId]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await params;
    const [task] = await db()
      .select()
      .from(translationTask)
      .where(eq(translationTask.id, taskId));

    if (!task || task.userId !== session.user.id) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const progress =
      task.status === 'completed'
        ? 100
        : task.status === 'failed'
          ? Math.min(Math.round((task.currentRound / task.totalRounds) * 100), 99)
          : Math.round((task.currentRound / task.totalRounds) * 100);

    return NextResponse.json({
      taskId: task.id,
      status: task.status,
      progress,
      currentRound: task.currentRound,
      totalRounds: task.totalRounds,
      errorMessage: task.errorMessage,
    });
  } catch (error) {
    console.error('[Translate Status] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
