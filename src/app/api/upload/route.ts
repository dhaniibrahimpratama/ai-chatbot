import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { chunkText, getEmbedding } from '@/lib/rag-utils';
import { createClient } from '@/utils/supabase/server';
import { extractText } from 'unpdf';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    let text = '';
    let filename = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      filename = (formData.get('filename') as string) || '';

      if (!file) {
        return NextResponse.json(
          { error: "File tidak boleh kosong" },
          { status: 400 }
        );
      }

      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'txt') {
        text = await file.text();
      } else if (fileExtension === 'pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdfResult = await extractText(arrayBuffer);
        text = pdfResult.text.join('\n');
      } else {
        return NextResponse.json(
          { error: "Format file tidak didukung. Hanya .txt dan .pdf yang diizinkan." },
          { status: 400 }
        );
      }

      if (!filename) {
        filename = file.name.replace(/\.[^/.]+$/, '');
      }
    } else {
      const body = await req.json();
      text = body.text;
      filename = body.filename;
    }

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Teks dokumen tidak boleh kosong (file mungkin kosong atau tidak dapat dibaca)" },
        { status: 400 }
      );
    }

    const chunks = chunkText(text, 500, 100);
    let savedCount = 0;

    for (const chunk of chunks) {
      const embeddingArray = await getEmbedding(chunk);

      const embeddingString = `[${embeddingArray.join(',')}]`;

      await prisma.$executeRaw`
        INSERT INTO "Document" (id, "userId", content, metadata, embedding, "isActive", "updatedAt")
        VALUES (
          gen_random_uuid()::text, 
          ${user.id}, 
          ${chunk}, 
          ${JSON.stringify({ filename: filename || 'Dokumen_Tanpa_Nama' })}::jsonb, 
          ${embeddingString}::vector,
          true, 
          now()
        )
      `;
      savedCount++;
    }

    return NextResponse.json({
      success: true,
      chunksSaved: savedCount,
      filename: filename,
    });

  } catch (error: any) {
    console.error("Error di Upload Pipeline:", error);
    return NextResponse.json(
      { error: "Gagal memproses dokumen: " + (error.message || "Internal server error") },
      { status: 500 }
    );
  }
}