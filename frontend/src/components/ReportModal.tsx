import React, { useState } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { submitReport, ReportTargetType } from "@/lib/report";
import { toast } from "@/hooks/use-toast";
import { Flag } from "lucide-react";

const REASONS = [
  "spam",
  "fake profile",
  "inappropriate behavior",
  "abusive content",
  "misleading skills",
  "harassment",
  "other",
];

export default function ReportModal({
  targetType,
  targetId,
  triggerLabel = "Report",
  children,
}: {
  targetType: ReportTargetType;
  targetId: string;
  triggerLabel?: string;
  children?: React.ReactNode;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await submitReport({
        targetType,
        targetId,
        reason,
        description,
        reporterId: user?.uid || null,
      });
      if (res.ok) {
        toast({ title: "Report submitted", description: "Thank you — we'll review this." });
        setOpen(false);
      } else if (res.reason === "duplicate") {
        toast({ title: "Already reported", description: "You already reported this recently." });
      } else {
        toast({ title: "Error", description: res.error?.message || "Failed to submit report", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to submit report", variant: "destructive" });
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ? (
          children
        ) : (
          <Button size="sm" variant="ghost" className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            {triggerLabel}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {targetType}</DialogTitle>
          <DialogDescription>Let us know why you're reporting this {targetType}. Reports are private.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Reason</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`text-left w-full rounded-md border px-3 py-2 ${reason === r ? "bg-accent" : "bg-background"}`}
                >
                  <div className="text-sm">{r}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Details (optional)</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add any details that will help moderators (optional)" />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} size="sm">Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting} size="sm">Submit Report</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
