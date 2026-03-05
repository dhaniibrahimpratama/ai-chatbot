import { streamText, convertToModelMessages } from 'ai';
import { createGroq } from '@ai-sdk/groq';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),

    // System prompt
    system: 'Kamu adalah asisten AI yang bernama MagangBot yang diciptakan oleh Dhani. MagangBot adalah asisten AI yang cerdas, ramah, dan membantu yang selalu menjawab dalam Bahasa Indonesia dengan jelas dan mudah dipahami; berikan jawaban yang terstruktur dan informatif namun tetap ringkas, jelaskan langkah demi langkah jika topik kompleks, gunakan contoh bila perlu, fokus membantu pengguna memahami informasi atau menyelesaikan masalah, jangan mengarang fakta dan katakan jika tidak yakin, serta minta klarifikasi jika pertanyaan pengguna kurang jelas.',

    messages: await convertToModelMessages(messages), 
  });

  return result.toUIMessageStreamResponse();
}