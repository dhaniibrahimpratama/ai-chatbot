import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

export async function getVoyageEmbedding(text: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-2-preview" });
    
    const result = await model.embedContent({
      content: { role: "user", parts: [{ text }] },
      taskType: TaskType.RETRIEVAL_DOCUMENT,
    });

    let values = Array.from(result.embedding.values);

    if (values.length > 1024) {
      values = values.slice(0, 1024);
    }

    while (values.length < 1024) {
      values.push(0);
    }

    return values;
  } catch (error: any) {
    console.error("Detail Error Gemini API:", error.message);
    throw new Error(`Gagal memanggil Gemini API. Cek terminal untuk detailnya.`);
  }
}

export function chunkText(text: string, size: number, overlap: number) {
  const words = text.split(/\s+/);
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + size).join(' ');
    chunks.push(chunk);
    i += (size - overlap);
  }
  return chunks;
}