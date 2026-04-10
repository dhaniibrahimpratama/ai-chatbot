// CHUNKING
export function chunkText(text: string, chunkSize: number = 500, overlap: number = 100): string[] {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const chunks: string[] = [];
  let i = 0;

  while (i < cleanText.length) {
    const chunk = cleanText.slice(i, i + chunkSize);
    chunks.push(chunk);
    i += chunkSize - overlap;
  }

  return chunks;
}

// VOYAGE AI EMBEDDING
export async function getVoyageEmbedding(text: string): Promise<number[]> {
  const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;

  if (!VOYAGE_API_KEY) {
    throw new Error("VOYAGE_API_KEY belum dipasang di file .env!");
  }

  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      input: text,
      model: "voyage-3",
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Gagal memanggil Voyage AI: ${errorData.message}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}
