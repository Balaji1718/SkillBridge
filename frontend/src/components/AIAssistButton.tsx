import { useState } from "react";
import { Sparkles, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import { sendGroqChat } from "../../../backend/lib/groq";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const quickActions = [
  "Extract skills from my description",
  "Suggest skills I could offer",
  "Suggest skills I might need",
  "Generate a skill exchange idea",
  "Rewrite my request professionally",
];

export default function AIAssistButton() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || loading) return;

    const userMsg: Message = { role: "user", content: prompt };
    const conversation: Message[] = [...messages, userMsg];
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const reply = await sendGroqChat(
        [
          {
            role: "system",
            content:
              "You are the SkillBridge AI assistant. Help users exchange skills effectively. Be concise, practical, and friendly. Focus on skill extraction, skill offering suggestions, request rewriting, and exchange ideas.",
          },
          ...conversation,
        ],
        { temperature: 0.5 },
      );

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? `I couldn't reach Groq right now: ${error.message}`
              : "I couldn't reach Groq right now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full gradient-accent shadow-lg transition-transform hover:scale-105 active:scale-95"
          aria-label="AI Assist"
        >
          <Sparkles className="h-6 w-6 text-accent-foreground" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-h-[520px] rounded-2xl border bg-card shadow-2xl flex flex-col animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <span className="font-heading font-semibold text-foreground">AI Assist</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Hi! I can help you with:</p>
                {quickActions.map((a) => (
                  <button
                    key={a}
                    onClick={() => sendMessage(a)}
                    className="block w-full text-left text-sm rounded-lg border px-3 py-2 text-foreground hover:bg-secondary transition-colors"
                  >
                    {a}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-sm rounded-xl px-3 py-2 max-w-[90%] ${
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {m.role === "assistant" ? (
                  <div className="prose prose-sm">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            ))}
            {loading && (
              <div className="bg-secondary text-secondary-foreground text-sm rounded-xl px-3 py-2 max-w-[90%] animate-pulse">
                Thinking...
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-3 flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="min-h-[40px] max-h-[80px] resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
            />
            <Button size="icon" onClick={() => sendMessage(input)} disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
