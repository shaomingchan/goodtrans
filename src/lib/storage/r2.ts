/**
 * Cloudflare R2 Storage
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { nanoid } from 'nanoid';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export async function uploadPDF(file: Buffer, filename: string): Promise<string> {
  const key = `pdfs/${nanoid()}-${filename}`;
  
  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: 'application/pdf',
    })
  );

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

export async function uploadMarkdown(content: string, filename: string): Promise<string> {
  const key = `translations/${nanoid()}-${filename}`;
  
  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: Buffer.from(content, 'utf-8'),
      ContentType: 'text/markdown',
    })
  );

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}
