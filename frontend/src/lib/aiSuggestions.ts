import { sendGroqChat, GroqMessage } from "@/lib/groq";

export type SuggestionType =
  | "introduction"
  | "collaboration"
  | "greeting"
  | "response"
  | "improvement";

export interface SuggestionContext {
  type: SuggestionType;
  userName?: string;
  mySkill?: string;
  theirSkill?: string;
  myName?: string;
  tone?: "professional" | "friendly" | "casual";
  additionalContext?: string;
}

function buildPrompt(context: SuggestionContext): string {
  const toneDesc = context.tone || "professional";
  const basePrompt = `Generate a short, ${toneDesc} message for a student skill exchange platform called SkillBridge. Keep it under 150 words. No markdown, just plain text.`;

  switch (context.type) {
    case "introduction":
      return `${basePrompt} This is an introduction message from ${context.myName || "a student"} who offers ${context.mySkill || "a skill"} and needs ${context.theirSkill || "help with something"}. Make it warm and genuine.`;
    case "collaboration":
      return `${basePrompt} This is a collaboration proposal message from ${context.myName || "a student"} to ${context.userName || "a peer"} for a skill exchange (I teach ${context.mySkill || "X"}, you teach me ${context.theirSkill || "Y"}). Make it clear and actionable.`;
    case "greeting":
      return `${basePrompt} This is a greeting message from ${context.myName || "a student"} to ${context.userName || "a peer"}. Make it friendly and encouraging.`;
    case "response":
      return `${basePrompt} This is a response message from ${context.myName || "a student"} to a collaboration offer from ${context.userName || "a peer"}. Make it positive and constructive.`;
    case "improvement":
      return `${basePrompt} Improve the following message for a student skill exchange platform: "${context.additionalContext}". Make it clearer, more professional, and more likely to result in a positive response.`;
    default:
      return basePrompt;
  }
}

export async function generateSuggestion(context: SuggestionContext, signal?: AbortSignal): Promise<string> {
  try {
    const prompt = buildPrompt(context);
    const messages: GroqMessage[] = [
      {
        role: "system",
        content: "You are a helpful assistant that generates friendly, professional, and concise messages for a student peer-to-peer skill exchange platform. Keep responses short, clear, and actionable.",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const suggestion = await sendGroqChat(messages, { signal, temperature: 0.7 });

    if (!suggestion || suggestion.trim().length === 0) {
      throw new Error("Generated empty suggestion");
    }

    return suggestion.trim();
  } catch (err: any) {
    console.error("AI suggestion error:", err);
    throw err;
  }
}
