import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, RefreshCw, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNotificationTriggers } from "@/hooks/useNotificationTriggers";
import { sendGroqChat } from "@/lib/groq";
import { cn } from "@/lib/utils";

export type AIEnhanceMode = "bio" | "request" | "skill" | "communication" | "goal";

interface AIEnhanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: AIEnhanceMode;
  sourceText: string;
  starterText?: string;
  title: string;
  description: string;
  onApply: (value: string) => void;
  applyLabel?: string;
  sourceLabel?: string;
  className?: string;
}

const MODE_LABELS: Record<AIEnhanceMode, string> = {
  bio: "Improve my bio",
  request: "Rewrite my request",
  skill: "Refine skill wording",
  communication: "Improve communication tone",
  goal: "Refine learning goal",
};

const MODE_GUIDANCE: Record<AIEnhanceMode, string> = {
  bio: "Make the bio clearer, more professional, and more welcoming for a broad skill exchange community.",
  request: "Rewrite the request so it is clearer, more concise, and easier to understand for potential matches.",
  skill: "Refine the wording so the skill name or description is easy to scan, normalized, and user-friendly.",
  communication: "Improve tone and phrasing so the message sounds respectful, clear, and collaborative.",
  goal: "Refine the learning goal so it is focused, realistic, and easy for another user to respond to.",
};

function cleanSuggestion(text: string) {
  return text
    .replace(/^```(?:text)?\s*/i, "")
    .replace(/```$/i, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sentenceCase(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return "";

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function buildLocalFallbackSuggestion(mode: AIEnhanceMode, draft: string) {
  const lines = draft
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const firstLine = lines[0] || draft.trim();
  const secondLine = lines[1] || "";
  const thirdLine = lines[2] || "";
  const fourthLine = lines[3] || "";

  switch (mode) {
    case "bio": {
      const bio = sentenceCase(firstLine.replace(/^bio\s*:\s*/i, ""));
      return [
        bio || "I enjoy sharing practical skills and learning with others.",
        "I value clear communication, thoughtful collaboration, and respectful exchanges across different skill areas.",
      ].join(" ");
    }
    case "request": {
      const title = sentenceCase(firstLine.replace(/^request\s*:\s*/i, ""));
      const description = sentenceCase(secondLine || "");
      const needSkill = thirdLine ? sentenceCase(thirdLine) : "";
      const offerSkill = fourthLine ? sentenceCase(fourthLine) : "";

      return [
        title ? `${title}.` : "",
        description,
        needSkill ? `I am looking for help with ${needSkill}.` : "",
        offerSkill ? `In return, I can offer ${offerSkill}.` : "",
        "I value clear communication, practical steps, and a collaborative approach.",
      ]
        .filter(Boolean)
        .join(" ");
    }
    case "skill":
      return sentenceCase(firstLine) || "Skill description refined for clarity.";
    case "communication":
      return [
        sentenceCase(firstLine) || "Here is a clearer version of the message.",
        "The wording is direct, respectful, and easy to act on.",
      ].join(" ");
    case "goal":
      return [
        sentenceCase(firstLine) || "Learning goal refined for clarity.",
        "The goal is now more focused, realistic, and easy to discuss.",
      ].join(" ");
    default:
      return sentenceCase(firstLine) || draft.trim();
  }
}

export default function AIEnhanceDialog({
  open,
  onOpenChange,
  mode,
  sourceText,
  starterText,
  title,
  description,
  onApply,
  applyLabel = "Apply suggestion",
  sourceLabel = "Current text",
  className,
}: AIEnhanceDialogProps) {
  const { toast } = useToast();
  const { notifyAIEnhancementCompleted } = useNotificationTriggers();
  const [draft, setDraft] = useState(sourceText);
  const [suggestion, setSuggestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef(new Map<string, string>());

  useEffect(() => {
    if (open) {
      setDraft(sourceText.trim() || starterText?.trim() || "");
      setSuggestion("");
      setError(null);
    }
  }, [open, sourceText, starterText]);

  const cacheKey = useMemo(() => `${mode}:${draft.trim()}`, [mode, draft]);

  const generateSuggestion = async (force = false) => {
    const promptSource = draft.trim() || starterText?.trim() || "";

    if (!promptSource) {
      setError("Add a short draft first so AI can improve it.");
      return;
    }

    const cached = cacheRef.current.get(cacheKey);
    if (!force && cached) {
      setSuggestion(cached);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const reply = await sendGroqChat(
        [
          {
            role: "system",
            content:
              "You are a lightweight writing coach for SkillBridge. Help users improve profile bios, request descriptions, skill wording, communication tone, and learning goals. Support programming, design, communication, language learning, business, productivity, creative arts, and academic skills. Be assistive only, concise, and practical. Do not auto-act, do not mention policy, and return only the improved text without markdown or bullets unless the user asks for them.",
          },
          {
            role: "user",
            content: [
              `Mode: ${MODE_LABELS[mode]}`,
              `Goal: ${MODE_GUIDANCE[mode]}`,
              `Return a polished version that keeps the original meaning and stays natural for SkillBridge.`,
              mode === "bio"
                ? "Keep the result roughly 60 to 120 words unless the input is shorter."
                : "Keep the result concise and easy to scan.",
              "Input text:",
              promptSource,
            ].join("\n"),
          },
        ],
        { temperature: 0.4 },
      );

      const cleaned = cleanSuggestion(reply);

      if (!cleaned || cleaned.length < 4) {
        throw new Error("AI returned an unusable suggestion.");
      }

      cacheRef.current.set(cacheKey, cleaned);
      setSuggestion(cleaned);
    } catch (err) {
      const fallback = cleanSuggestion(buildLocalFallbackSuggestion(mode, promptSource));
      if (fallback) {
        cacheRef.current.set(cacheKey, fallback);
        setSuggestion(fallback);
        setError(null);
        toast({
          title: "Using local fallback",
          description: "Groq could not respond, so a lightweight local rewrite was generated instead.",
        });
      } else {
        const message = err instanceof Error ? err.message : "AI suggestion failed.";
        setError(message);
        setSuggestion("");
      }
    } finally {
      setLoading(false);
    }
  };

  const copySuggestion = async () => {
    if (!suggestion) return;

    try {
      await navigator.clipboard.writeText(suggestion);
      toast({ title: "Copied to clipboard" });
    } catch {
      toast({ title: "Copy failed", description: "Your browser blocked clipboard access.", variant: "destructive" });
    }
  };

  const applySuggestion = () => {
    if (!suggestion.trim()) {
      setError("Generate a suggestion before applying it.");
      return;
    }

    onApply(suggestion.trim());
    onOpenChange(false);
    notifyAIEnhancementCompleted(mode);
    toast({ title: "Suggestion applied", description: "Review it before saving or submitting." });
  };

  const hasSuggestion = suggestion.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-2xl max-h-[90vh] overflow-y-auto", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <Sparkles className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium text-foreground">{sourceLabel}</label>
              <Badge variant="secondary" className="rounded-full">
                {MODE_LABELS[mode]}
              </Badge>
            </div>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Enter text to improve..."
              className="min-h-[120px]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium text-foreground">AI suggestion</label>
              {hasSuggestion && <Check className="h-4 w-4 text-emerald-500" />}
            </div>
            <div className="rounded-xl border bg-muted/30 p-3 min-h-[120px]">
              {loading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="h-4 w-full rounded bg-muted" />
                  <div className="h-4 w-5/6 rounded bg-muted" />
                </div>
              ) : hasSuggestion ? (
                <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{suggestion}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Generate a suggestion to preview a cleaner version here. You decide whether to apply it.
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="secondary" onClick={copySuggestion} disabled={!hasSuggestion || loading}>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          <Button type="button" variant="outline" onClick={() => generateSuggestion(true)} loading={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerate
          </Button>
          <Button type="button" onClick={applySuggestion} disabled={!hasSuggestion || loading}>
            <Check className="mr-2 h-4 w-4" />
            {applyLabel}
          </Button>
        </DialogFooter>

        <div className="flex justify-start">
          <Button type="button" variant="ghost" size="sm" onClick={() => generateSuggestion()} loading={loading}>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate suggestion
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}