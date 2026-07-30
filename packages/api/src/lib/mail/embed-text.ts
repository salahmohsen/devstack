/**
 * Optional OpenAI embeddings for correction retrieval.
 * No-ops without OPENAI_API_KEY — lexical few-shot still works.
 */

const DEFAULT_MODEL = "text-embedding-3-small";

export async function embedTextForCorrections(text: string): Promise<number[] | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key || !text.trim()) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_EMBEDDING_MODEL?.trim() ?? DEFAULT_MODEL,
        input: text.slice(0, 8000)
      })
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: Array<{ embedding?: number[] }>;
    };
    const emb = json.data?.[0]?.embedding;
    return Array.isArray(emb) && emb.length > 0 ? emb : null;
  } catch {
    return null;
  }
}
