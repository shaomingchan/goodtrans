import { NextResponse } from 'next/server';

// Simplified search route for deployment - avoids fumadocs search indexing issues
export async function GET() {
  return NextResponse.json([]);
}
