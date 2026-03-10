import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: "Parameter sessionId wajib diisi" }, 
        { status: 400 }
      );
    }

    const messages = await prisma.message.findMany({
      where: {
        sessionId: sessionId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json(messages);
    
  } catch (error) {
    console.error("Error mengambil pesan:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data pesan" }, 
      { status: 500 }
    );
  }
}