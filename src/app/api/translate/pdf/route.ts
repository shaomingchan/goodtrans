import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';

interface PDFRequest {
  title: string;
  content: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PDFRequest = await request.json();
    const { title, content, sourceLanguage, targetLanguage } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: title, content' },
        { status: 400 }
      );
    }

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const maxWidth = pageWidth - 2 * margin;

    // Add title
    doc.setFontSize(16);
    doc.text(title, margin, margin + 10);

    // Add metadata
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Translated from ${sourceLanguage} to ${targetLanguage}`,
      margin,
      margin + 20
    );

    // Add content
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const splitText = doc.splitTextToSize(content, maxWidth);
    doc.text(splitText, margin, margin + 30);

    // Generate PDF as base64
    const pdfBase64 = doc.output('dataurlstring');

    return NextResponse.json({
      success: true,
      pdf: pdfBase64,
      filename: `${title.replace(/\s+/g, '_')}_${sourceLanguage}_to_${targetLanguage}.pdf`,
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'PDF generation failed', details: String(error) },
      { status: 500 }
    );
  }
}
