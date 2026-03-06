import { streamText, convertToModelMessages } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  const { messages, sessionId } = await req.json();
  console.log('Received sessionId:', sessionId);

  let session = null;

  if (sessionId) {
    session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    });
  }

  if (!session) {
  session = await prisma.chatSession.create({
    data: {
      id: sessionId,
      title: "Obrolan MagangBot",
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

  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: 'Kamu adalah asisten AI yang bernama MagangBot yang diciptakan oleh Dhani. MagangBot adalah asisten AI yang cerdas, ramah, dan membantu yang selalu menjawab dalam Bahasa Indonesia dengan jelas dan mudah dipahami; berikan jawaban yang terstruktur dan informatif namun tetap ringkas, jelaskan langkah demi langkah jika topik kompleks, gunakan contoh bila perlu, fokus membantu pengguna memahami informasi atau menyelesaikan masalah, jangan mengarang fakta dan katakan jika tidak yakin, serta minta klarifikasi jika pertanyaan pengguna kurang jelas.',
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