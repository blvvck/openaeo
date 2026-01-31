import OpenAI from "openai";

let cachedClient: OpenAI | undefined;

export function openAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for this feature.");
  cachedClient ??= new OpenAI({ apiKey, timeout: 30_000, maxRetries: 2 });
  return cachedClient;
}

export function openAIModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

export async function requestJson<T>(instruction: string, input: string): Promise<T> {
  const completion = await openAIClient().chat.completions.create({
    model: openAIModel(),
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: instruction },
      { role: "user", content: input },
    ],
  });
  const body = completion.choices[0]?.message.content;
  if (!body) throw new Error("The model returned an empty result.");
  return JSON.parse(body) as T;
}

export async function answerWithOpenAI(prompt: string): Promise<string> {
  const completion = await openAIClient().chat.completions.create({
    model: openAIModel(),
    temperature: 0.4,
    max_tokens: 800,
    messages: [
      { role: "system", content: "Answer the user's question accurately and naturally. Do not invent citations or URLs." },
      { role: "user", content: prompt },
    ],
  });
  const answer = completion.choices[0]?.message.content?.trim();
  if (!answer) throw new Error("The model returned an empty answer.");
  return answer;
}
