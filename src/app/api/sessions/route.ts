import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const sessions = await prisma.chatSession.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(sessions);
    
  } catch (error) {
    console.error("Error mengambil sesi:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data riwayat obrolan" }, 
      { status: 500 }
    );
  }
}