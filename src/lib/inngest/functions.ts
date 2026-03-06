/**
 * Translation workflow function
 */

import { inngest } from './client';
import { translate5Rounds } from '../translation/engine';
import { extractTerms, formatGlossary } from '../translation/glossary';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const translationWorkflow = inngest.createFunction(
  { id: 'translation-workflow' },
  { event: 'translation/start' },
  async ({ event, step }) => {
    const { taskId, fileUrl, sourceLang, targetLang, email } = event.data;

    // Step 1: Extract text from PDF (MinerU placeholder)
    const text = await step.run('extract-pdf', async () => {
      // TODO: Integrate MinerU
      return 'Sample text for translation';
    });

    // Step 2: Extract glossary
    const terms = await step.run('extract-glossary', async () => {
      return await extractTerms(text, sourceLang, targetLang);
    });

    // Step 3: Translate
    const result = await step.run('translate', async () => {
      const glossary = formatGlossary(terms);
      return await translate5Rounds(text, targetLang, glossary);
    });

    // Step 4: Send email
    await step.run('send-email', async () => {
      await resend.emails.send({
        from: 'GoodTrans <noreply@goodtrans.ai>',
        to: email,
        subject: 'Your translation is ready',
        html: `<p>Download: <a href="#">Click here</a></p>`,
      });
    });

    return { taskId, status: 'completed' };
  }
);
