import React, { useState, useEffect } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { dismissOnboarding, resetOnboarding } from "@/lib/onboarding";
import { useAuth } from "@/contexts/AuthContext";

const steps = [
  {
    id: "welcome",
    title: "Welcome to SkillBridge",
    description: "A friendly place to teach and learn practical skills with peers.",
  },
  {
    id: "skills",
    title: "Add your skills",
    description: "Tell others what you can teach and what you'd like to learn. This helps matching work better.",
  },
  {
    id: "profile",
    title: "Complete your profile",
    description: "Add a short bio and availability — profiles with details get better matches.",
  },
  {
    id: "request",
    title: "Create your first request",
    description: "Create a simple request describing the skill you want and what you offer in return.",
  },
  {
    id: "explore",
    title: "Explore matches & recommendations",
    description: "Browse suggestions and connect with peers for exchanges.",
  },
];

export default function OnboardingModal({ open: openProp, onOpenChange }: { open?: boolean; onOpenChange?: (v: boolean) => void } | any) {
  const { profile } = useAuth();
  const [open, setOpen] = useState<boolean>(!!openProp);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (typeof openProp === "boolean") setOpen(openProp);
  }, [openProp]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("skillbridge:onboarding:show", handler as any);
    return () => window.removeEventListener("skillbridge:onboarding:show", handler as any);
  }, []);

  const close = () => {
    setOpen(false);
    onOpenChange?.(false);
  };

  const handleSkip = () => {
    dismissOnboarding();
    close();
  };

  const handleDone = () => {
    dismissOnboarding();
    close();
  };

  const reset = () => {
    resetOnboarding();
    setIndex(0);
    setOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); onOpenChange?.(v); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">Help</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{steps[index].title}</DialogTitle>
          <DialogDescription>{steps[index].description}</DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {steps[index].id === "skills" && (
            <p className="text-sm">You can edit your skills on your <Link to="/profile" className="underline">Profile</Link> page.</p>
          )}

          {steps[index].id === "profile" && (
            <p className="text-sm">Add a bio and availability on the <Link to="/profile" className="underline">Profile</Link> page.</p>
          )}

          {steps[index].id === "request" && (
            <p className="text-sm">Create your first request on the <Link to="/create-request" className="underline">Create Request</Link> page.</p>
          )}

          {steps[index].id === "explore" && (
            <p className="text-sm">Try <Link to="/matches" className="underline">Matches</Link> or <Link to="/discover" className="underline">Discover</Link> to find partners.</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-6">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleSkip}>Don't show again</Button>
            <Button size="sm" variant="ghost" onClick={() => { reset(); }}>Reset onboarding</Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>Back</Button>
            {index < steps.length - 1 ? (
              <Button size="sm" onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}>Next</Button>
            ) : (
              <Button size="sm" onClick={handleDone}>Done</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
