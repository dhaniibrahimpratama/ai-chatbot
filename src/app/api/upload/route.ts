import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { chunkText, getVoyageEmbedding } from '@/lib/rag-utils';

// Inisialisasi koneksi database
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, filename } = body;

    if (!text) {
      return NextResponse.json(
        { error: "Teks dokumen tidak boleh kosong" }, 
        { status: 400 }
      );
    }

    const chunks = chunkText(text, 500, 100);
    let savedCount = 0;

    for (const chunk of chunks) {
      const embeddingArray = await getVoyageEmbedding(chunk);
      
      const embeddingString = `[${embeddingArray.join(',')}]`;

      await prisma.$executeRaw`
        INSERT INTO "Document" (id, content, metadata, embedding, "updatedAt")
        VALUES (
          gen_random_uuid()::text, 
          ${chunk}, 
          ${JSON.stringify({ filename: filename || 'Dokumen_Tanpa_Nama' })}::jsonb, 
          ${embeddingString}::vector, 
          now()
        )
      `;
      savedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil memproses dokumen!`,
      chunksSaved: savedCount
    });

  } catch (error: any) {
    console.error("Error di Upload Pipeline:", error);
    return NextResponse.json(
      { error: "Gagal memproses dokumen internal", detail: error.message }, 
      { status: 500 }
    );
  }
}