import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [sessionCount, messageCount, documentCount] = await Promise.all([
      prisma.chatSession.count({ where: { userId: user.id } }),
      prisma.message.count({ where: { session: { userId: user.id } } }),
      prisma.document.count({ where: { userId: user.id, isActive: true } }),
    ]);

    const recentSessions = await prisma.chatSession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, title: true, createdAt: true },
    });

    return NextResponse.json({
      email: user.email,
      createdAt: user.created_at,
      stats: { sessionCount, messageCount, documentCount },
      recentSessions,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil profil' }, { status: 500 });
  }
}