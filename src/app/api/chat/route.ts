import { streamText, convertToModelMessages, generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { getVoyageEmbedding } from '@/lib/rag-utils';

export const runtime = 'nodejs';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  await prisma.user.upsert({
    where: { id: user.id },
    update: {}, 
    create: {
      id: user.id,
      email: user.email ?? 'tanpa-email@magang.com',
    }
  });

  const { messages, sessionId } = await req.json();
  console.log('Received sessionId:', sessionId);

  let session = null;

  if (sessionId) {
    session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    });
  }

  if (session && session.userId !== user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  if (!session) {
    const firstMessage = messages[0];
    let firstMessageText = '';

    if (Array.isArray(firstMessage.parts)) {
      firstMessageText = firstMessage.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('');
    } else if (typeof firstMessage.content === 'string') {
      firstMessageText = firstMessage.content;
    } else {
      firstMessageText = 'Obrolan MagangBot';
    }

    let title = firstMessageText.slice(0, 40);
    try {
      const titleResult = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        prompt: `Buat judul singkat (maksimal 5 kata) dalam Bahasa Indonesia untuk percakapan yang dimulai dengan pesan ini: "${firstMessageText}". Balas HANYA dengan judulnya saja, tanpa tanda kutip, tanpa penjelasan tambahan.`,
      });
      title = titleResult.text.trim();
    } catch (e) {
      console.error('Failed to generate title:', e);
    }

    session = await prisma.chatSession.create({
      data: {
        id: sessionId,
        title: title,
        userId: user.id,
      },
    });
  }

  const lastUserMessage = messages[messages.length - 1];

  let userContent = '';
  if (Array.isArray(lastUserMessage.parts)) {
    userContent = lastUserMessage.parts
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join('');
  } else if (typeof lastUserMessage.content === 'string') {
    userContent = lastUserMessage.content;
  } else if (Array.isArray(lastUserMessage.content)) {
    userContent = lastUserMessage.content
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join('');
  } else {
    userContent = String(lastUserMessage.content ?? '');
  }

  await prisma.message.create({
    data: {
      content: userContent,
      role: 'user',
      sessionId: session.id,
    },
  });

  await prisma.chatSession.update({
    where: { id: session.id },
    data: { createdAt: new Date() },
  });

  let contextText = "";
  try {
    console.log("Menerjemahkan pertanyaan ke vektor...");
    const embeddingArray = await getVoyageEmbedding(userContent);
    const embeddingString = `[${embeddingArray.join(',')}]`;

    console.log("Mencari dokumen yang relevan di Supabase...");

    const matchedDocs = await prisma.$queryRaw<any[]>`
      SELECT content, 1 - (embedding <=> ${embeddingString}::vector) as similarity
      FROM "Document"
      WHERE 1=1
      AND "userId" = ${user.id} 
      ORDER BY similarity DESC
      LIMIT 3;
    `;

    contextText = matchedDocs.map(doc => doc.content).join('\n\n');
    console.log("✅ Konteks berhasil ditarik!");
  } catch (err) {
    console.error("Gagal menarik konteks RAG:", err);
  }

  const systemPrompt = `Kamu adalah asisten AI yang bernama MagangBot yang diciptakan oleh Dhani. MagangBot adalah asisten AI yang cerdas, ramah, dan membantu yang selalu menjawab dalam Bahasa Indonesia dengan jelas dan mudah dipahami; berikan jawaban yang terstruktur dan informatif namun tetap ringkas, jelaskan langkah demi langkah jika topik kompleks, gunakan contoh bila perlu, fokus membantu pengguna memahami informasi atau menyelesaikan masalah, jangan mengarang fakta dan katakan jika tidak yakin, serta minta klarifikasi jika pertanyaan pengguna kurang jelas.

  PENTING - ATURAN MENJAWAB:
  Kamu telah diberikan KONTEKS DOKUMEN di bawah ini. Gunakan HANYA informasi dari konteks tersebut untuk menjawab pertanyaan user. 
  Jika jawabannya tidak ada di dalam konteks, katakan dengan jujur "Maaf, saya tidak memiliki informasi mengenai hal tersebut di dalam basis data dokumen saya," dan JANGAN mengarang fakta.

  KONTEKS DOKUMEN:
  ${contextText}`;

  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),

    async onFinish({ text }) {
      await prisma.message.create({
        data: {
          content: text,
          role: 'assistant',
          sessionId: session!.id,
        },
      });
    },
  });

  return result.toUIMessageStreamResponse({
    headers: {
      'X-Session-Id': session.id,
    },
  });
}