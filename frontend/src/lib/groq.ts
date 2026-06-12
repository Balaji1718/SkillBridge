export type GroqRole = "system" | "user" | "assistant";

export interface GroqMessage {
  role: GroqRole;
  content: string;
}

interface GroqChatOptions {
  model?: string;
  temperature?: number;
  signal?: AbortSignal;
}

const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
const GROQ_API_URL = `${apiBase}/api/groq`;

export async function sendGroqChat(messages: GroqMessage[], options: GroqChatOptions = {}) {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    signal: options.signal,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
      options: {
        model: options.model,
        temperature: options.temperature,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `AI request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as {
    content?: string;
  };

  const content = data.content?.trim();

  if (!content) {
    throw new Error("AI service returned an empty response.");
  }

  return content;
}