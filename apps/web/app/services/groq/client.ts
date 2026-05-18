import { z } from "zod";

const GROQ_API_BASE = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "llama-3.1-8b-instant";

const GroqResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string() }),
      }),
    )
    .min(1),
});

export async function generateText(
  prompt: string,
  apiKey: string,
  temperature = 0.7,
): Promise<string> {
  const res = await fetch(`${GROQ_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 512,
      temperature,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq API error ${res.status}: ${text}`);
  }

  const parsed = GroqResponseSchema.safeParse(await res.json());
  if (!parsed.success) throw new Error("Unexpected Groq response shape");

  return parsed.data.choices[0].message.content.trim();
}
