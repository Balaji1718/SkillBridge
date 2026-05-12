import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import SkillAutocomplete from "@/components/SkillAutocomplete";
import AIEnhanceDialog from "@/components/AIEnhanceDialog";
import { Sparkles } from "lucide-react";

export default function CreateRequestPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [needSkill, setNeedSkill] = useState("");
  const [offerSkill, setOfferSkill] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requestAiOpen, setRequestAiOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "requests"), {
        userId: user.uid,
        userName: user.displayName || "Anonymous",
        title,
        description,
        need_skill: needSkill.toLowerCase().trim(),
        offer_skill: offerSkill.toLowerCase().trim(),
        status: "open",
        createdAt: serverTimestamp(),
      });
      toast({ title: "Request created!" });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold">Create Exchange Request</h1>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRequestAiOpen(true)}
          className="shrink-0"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Improve with AI
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">What do you want to exchange?</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. JavaScript help for Spanish lessons" required />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what you're looking for and what you can offer..." required />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Skill I Need</Label>
                <SkillAutocomplete
                  value={needSkill}
                  onChange={setNeedSkill}
                  placeholder="e.g. spanish, javascript, spanish..."
                />
              </div>
              <div>
                <Label>Skill I Offer</Label>
                <SkillAutocomplete
                  value={offerSkill}
                  onChange={setOfferSkill}
                  placeholder="e.g. javascript, piano, french..."
                />
              </div>
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Creating..." : "Post Request"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AIEnhanceDialog
        open={requestAiOpen}
        onOpenChange={setRequestAiOpen}
        mode="request"
        sourceText={[title, description, needSkill, offerSkill].filter(Boolean).join("\n")}
        title="Improve this request with AI"
        description="Rewrite your request so it is clearer, more professional, and easier for other people to respond to. The result stays under your control until you apply it."
        sourceLabel="Current request draft"
        applyLabel="Apply description"
        onApply={(value) => setDescription(value)}
      />
    </div>
  );
}
