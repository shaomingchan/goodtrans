/**
 * GoodTrans Translation Tasks Schema
 */

import { pgTable, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';

export const translationTasks = pgTable('translation_tasks', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: text('user_id').notNull(),
  email: text('email').notNull(),
  
  // File info
  fileUrl: text('file_url').notNull(),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size').notNull(),
  
  // Translation config
  sourceLang: text('source_lang').notNull(),
  targetLang: text('target_lang').notNull(),
  wordCount: integer('word_count').notNull(),
  
  // Status
  status: text('status').notNull().default('pending'), // pending, processing, completed, failed
  progress: integer('progress').default(0),
  
  // Results
  resultUrl: text('result_url'),
  glossary: jsonb('glossary').$type<Array<{ source: string; target: string }>>(),
  qualityScore: integer('quality_score'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

export const userGlossary = pgTable('user_glossary', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: text('user_id').notNull(),
  source: text('source').notNull(),
  target: text('target').notNull(),
  sourceLang: text('source_lang').notNull(),
  targetLang: text('target_lang').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
