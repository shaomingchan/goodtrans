import { NextRequest, NextResponse } from 'next/server';

/**
 * PDF Text Extraction API using MinerU
 * POST /api/pdf/extract
 * Body: { pdfUrl: string } or FormData with 'file'
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let pdfUrl: string | null = null;

    // Handle JSON or FormData
    if (contentType.includes('application/json')) {
      const body = await req.json();
      pdfUrl = body.pdfUrl;
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }
      // TODO: Upload to R2/S3 and get URL
      return NextResponse.json({ error: 'File upload not implemented yet' }, { status: 501 });
    }

    if (!pdfUrl) {
      return NextResponse.json({ error: 'pdfUrl is required' }, { status: 400 });
    }

    // Call MinerU API (placeholder - needs actual API endpoint)
    const mineruApiUrl = process.env.MINERU_API_URL || 'https://api.mineru.ai/extract';
    const mineruApiKey = process.env.MINERU_API_KEY;

    if (!mineruApiKey) {
      return NextResponse.json({ error: 'MinerU API key not configured' }, { status: 500 });
    }

    const response = await fetch(mineruApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mineruApiKey}`,
      },
      body: JSON.stringify({ pdf_url: pdfUrl }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: `MinerU API error: ${error}` }, { status: response.status });
    }

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      text: result.text || result.content || '',
      metadata: result.metadata || {},
    });

  } catch (error) {
    console.error('[PDF Extract] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
