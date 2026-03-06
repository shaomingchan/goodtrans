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

export const translationWorkflow = inngest.createFunction(
  { id: 'translation-workflow', retries: 2 },
  { event: 'translation/start' },
  async ({ event, step }) => {
    const { taskId, sourceText, sourceLang, targetLang, email } = event.data;

    try {
      // Update status to processing
      await step.run('update-status-processing', async () => {
        await db().update(translationTask)
          .set({ status: 'processing', currentRound: 1 })
          .where(eq(translationTask.id, taskId));
      });

      // Step 1: Extract glossary
      const terms = await step.run('extract-glossary', async () => {
        await db().update(translationTask)
          .set({ currentRound: 1 })
          .where(eq(translationTask.id, taskId));
        return await extractTerms(sourceText, sourceLang, targetLang);
      });

      // Step 2-5: 5-round translation
      const result = await step.run('translate-5-rounds', async () => {
        const glossary = formatGlossary(terms);
        return await translate5Rounds(sourceText, targetLang, glossary);
      });

      // Step 6: Upload to R2
      const fileUrl = await step.run('upload-result', async () => {
        const markdown = result.segments.map(s => s.translated).join('\n\n');
        return await uploadMarkdown(markdown, `${taskId}.md`);
      });

      // Step 7: Update DB
      await step.run('update-db', async () => {
        await db().update(translationTask)
          .set({
            status: 'completed',
            translatedText: result.segments.map(s => s.translated).join('\n\n'),
            currentRound: 5,
            completedAt: new Date(),
          })
          .where(eq(translationTask.id, taskId));
      });

      // Step 8: Send email
      await step.run('send-email', async () => {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'GoodTrans <noreply@goodtrans.ai>',
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
      // Update status to failed
      await db().update(translationTask)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        })
        .where(eq(translationTask.id, taskId));

      throw error;
    }
  }
);
