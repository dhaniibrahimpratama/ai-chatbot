import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const sessions = await prisma.chatSession.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(sessions);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil sesi' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    await prisma.chatSession.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal menghapus sesi' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, title } = await req.json();
    const updated = await prisma.chatSession.update({
      where: { id },
      data: { title },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengubah judul' }, { status: 500 });
  }
}