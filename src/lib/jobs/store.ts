/**
 * Vlog job store — database-backed via Drizzle ORM.
 * Replaces the previous in-memory Map implementation.
 */
import { eq } from 'drizzle-orm';

import { vlogJob } from '@/config/db/schema';
import { db } from '@/core/db';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job {
  id: string;
  userId: string | null;
  status: JobStatus;
  style: string;
  photoUrls: string[];
  videoUrl: string | null;
  rhTaskIds: string[] | null;
  errorMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

export async function createJob(
  id: string,
  photoUrls: string[],
  style: string,
  userId?: string
): Promise<Job> {
  const [row] = await db()
    .insert(vlogJob)
    .values({
      id,
      userId: userId ?? null,
      status: 'pending',
      style,
      photoUrls,
    })
    .returning();
  return row as Job;
}

export async function getJob(id: string): Promise<Job | undefined> {
  const [row] = await db()
    .select()
    .from(vlogJob)
    .where(eq(vlogJob.id, id))
    .limit(1);
  return row as Job | undefined;
}

export async function updateJob(
  id: string,
  update: Partial<Pick<Job, 'status' | 'videoUrl' | 'errorMessage' | 'rhTaskIds' | 'completedAt'>>
): Promise<Job | undefined> {
  const [row] = await db()
    .update(vlogJob)
    .set(update)
    .where(eq(vlogJob.id, id))
    .returning();
  return row as Job | undefined;
}
