/**
 * Translation workflow function
 */

import { inngest } from './client';
import { translate5Rounds } from '../translation/engine';
import { extractTerms, formatGlossary } from '../translation/glossary';
import { uploadMarkdown } from '../storage/r2';
import { Resend } from 'resend';
import { db } from '@/core/db';
import { translationTask } from '@/config/db/schema';
import { eq } from 'drizzle-orm';

async function updateTask(taskId: string, values: Partial<typeof translationTask.$inferInsert>) {
  await db().update(translationTask).set(values).where(eq(translationTask.id, taskId));
}

export const translationWorkflow = inngest.createFunction(
  { id: 'translation-workflow', retries: 2 },
  { event: 'translation/start' },
  async ({ event, step }) => {
    const { taskId, sourceText, sourceLang, targetLang, email } = event.data;

    try {
      await step.run('update-status-processing', async () => {
        await updateTask(taskId, { status: 'processing', currentRound: 1, errorMessage: null });
      });

      const terms = await step.run('extract-glossary', async () => {
        await updateTask(taskId, { currentRound: 1 });
        return await extractTerms(sourceText, sourceLang, targetLang);
      });

      const result = await step.run('translate-5-rounds', async () => {
        const glossary = formatGlossary(terms);
        return await translate5Rounds(sourceText, targetLang, glossary, {
          sourceLang,
          onRoundChange: async (round) => {
            await updateTask(taskId, {
              currentRound: round,
            });
          },
        });
      });

      const fileUrl = await step.run('upload-result', async () => {
        await updateTask(taskId, { currentRound: 5 });
        const markdown = result.segments.map((s) => s.translated).join('\n\n');
        return await uploadMarkdown(markdown, `${taskId}.md`);
      });

      await step.run('update-db', async () => {
        await updateTask(taskId, {
          status: 'completed',
          translatedText: result.segments.map((s) => s.translated).join('\n\n'),
          currentRound: 5,
          completedAt: new Date(),
        });
      });

      await step.run('send-email', async () => {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'GoodTrans <noreply@animaker.dev>',
          to: email,
          subject: '✅ Your translation is ready',
          html: `<h2>Translation Completed</h2>
<p>Your document has been translated from ${sourceLang} to ${targetLang}.</p>
<p><a href="${fileUrl}" style="background:#0070f3;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Download Translation</a></p>
<p>Thank you for using GoodTrans!</p>`,
        });
      });

      return { taskId, status: 'completed', fileUrl };
    } catch (error) {
      await updateTask(taskId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }
);
