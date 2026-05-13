import React, { useState } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { generateSuggestion, SuggestionContext, SuggestionType } from "@/lib/aiSuggestions";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Copy, RotateCcw } from "lucide-react";

const SUGGESTION_LABELS: Record<SuggestionType, string> = {
  introduction: "Generate introduction",
  collaboration: "Suggest collaboration",
  greeting: "Write greeting",
  response: "Write response",
  improvement: "Improve message",
};

export default function SuggestionModal({
  type,
  userName,
  mySkill,
  theirSkill,
  tone = "professional",
  children,
}: {
  type: SuggestionType;
  userName?: string;
  mySkill?: string;
  theirSkill?: string;
  tone?: "professional" | "friendly" | "casual";
  children?: React.ReactNode;
}) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateNew = async () => {
    setError("");
    setSuggestion("");
    setLoading(true);

    try {
      const result = await generateSuggestion({
        type,
        userName,
        mySkill,
        theirSkill,
        myName: profile?.displayName,
        tone,
      });
      setSuggestion(result);
    } catch (err: any) {
      const errMsg = err.message || "Failed to generate suggestion";
      setError(errMsg);
      toast({ title: "Error", description: errMsg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(suggestion);
      toast({ title: "Copied to clipboard!" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to copy", variant: "destructive" });
    }
  };

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !suggestion && !error) {
      await generateNew();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {children ? (
          children
        ) : (
          <Button size="sm" variant="ghost" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            {SUGGESTION_LABELS[type]}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {SUGGESTION_LABELS[type]}
          </DialogTitle>
          <DialogDescription>
            AI-generated suggestion — copy and customize as needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {loading ? (
            <div className="space-y-2">
              <div className="h-20 bg-muted rounded-md animate-pulse" />
              <p className="text-xs text-muted-foreground text-center">Generating suggestion...</p>
            </div>
          ) : error ? (
            <div className="space-y-3">
              <div className="p-3 bg-destructive/10 rounded-md border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
              <Button onClick={generateNew} className="w-full" size="sm">
                Try again
              </Button>
            </div>
          ) : suggestion ? (
            <div className="space-y-3">
              <div className="p-4 bg-muted rounded-md border min-h-24 flex flex-col justify-center">
                <p className="text-sm leading-relaxed">{suggestion}</p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary" className="text-xs">
                  {tone.charAt(0).toUpperCase() + tone.slice(1)} tone
                </Badge>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={copyToClipboard} className="flex items-center gap-2">
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                  <Button size="sm" variant="outline" onClick={generateNew} loading={loading} className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Regenerate
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
