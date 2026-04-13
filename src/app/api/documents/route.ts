import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/utils/supabase/server';
import { chunkText, getVoyageEmbedding } from '@/lib/rag-utils'; // <--- Butuh chunkText juga

const prisma = new PrismaClient();

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const docs = await prisma.document.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, metadata: true, isActive: true, createdAt: true, content: true }
    });

    const groupedDocs = docs.reduce((acc, doc) => {
      const filename = (doc.metadata as any)?.filename || 'Untitled';
      if (!acc[filename]) {
        acc[filename] = {
          filename,
          isActive: doc.isActive,
          createdAt: doc.createdAt,
          content: doc.content,
          chunkCount: 1
        };
      } else {
        acc[filename].content += '\n\n' + doc.content;
        acc[filename].chunkCount += 1;
      }
      return acc;
    }, {} as Record<string, any>);

    const finalArray = Object.values(groupedDocs).sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(finalArray);
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { filename, isActive } = await req.json();

    const allDocs = await prisma.document.findMany({ where: { userId: user?.id } });
    const idsToUpdate = allDocs.filter(d => (d.metadata as any)?.filename === filename).map(d => d.id);

    await prisma.document.updateMany({
      where: { id: { in: idsToUpdate } },
      data: { isActive: !isActive }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Gagal update status" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { filename } = await req.json();

    const allDocs = await prisma.document.findMany({ where: { userId: user?.id } });
    const idsToDelete = allDocs.filter(d => (d.metadata as any)?.filename === filename).map(d => d.id);

    await prisma.document.deleteMany({ where: { id: { in: idsToDelete } } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Gagal menghapus dokumen" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { originalFilename, newFilename, content } = await req.json();

    const allDocs = await prisma.document.findMany({ where: { userId: user.id } });
    const oldIds = allDocs.filter(d => (d.metadata as any)?.filename === originalFilename).map(d => d.id);
    if (oldIds.length > 0) {
      await prisma.document.deleteMany({ where: { id: { in: oldIds } } });
    }

    const chunks = chunkText(content, 500, 100);

    for (const chunk of chunks) {
      const embeddingArray = await getVoyageEmbedding(chunk);
      const embeddingString = `[${embeddingArray.join(',')}]`;

      await prisma.$executeRaw`
        INSERT INTO "Document" (id, "userId", content, metadata, embedding, "isActive", "updatedAt")
        VALUES (
          gen_random_uuid()::text, 
          ${user.id}, 
          ${chunk}, 
          ${JSON.stringify({ filename: newFilename || 'Tanpa Nama' })}::jsonb, 
          ${embeddingString}::vector, 
          true,
          now()
        )
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error Edit Dokumen:", error);
    return NextResponse.json({ error: "Gagal menyimpan perubahan" }, { status: 500 });
  }
}