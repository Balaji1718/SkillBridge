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

export default function CreateRequestPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [needSkill, setNeedSkill] = useState("");
  const [offerSkill, setOfferSkill] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      <h1 className="font-heading text-2xl font-bold mb-6">Create Exchange Request</h1>
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
                <Input value={needSkill} onChange={(e) => setNeedSkill(e.target.value)} placeholder="e.g. spanish" required />
              </div>
              <div>
                <Label>Skill I Offer</Label>
                <Input value={offerSkill} onChange={(e) => setOfferSkill(e.target.value)} placeholder="e.g. javascript" required />
              </div>
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Creating..." : "Post Request"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
