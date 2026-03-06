import { NextRequest, NextResponse } from 'next/server';

/**
 * Translation Task Status API
 * GET /api/translate/[taskId]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    // TODO: Query task from database
    
    return NextResponse.json({
      taskId,
      status: 'pending', // pending | processing | completed | failed
      progress: 0,
      currentRound: 0,
      totalRounds: 5,
    });

  } catch (error) {
    console.error('[Translate Status] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
