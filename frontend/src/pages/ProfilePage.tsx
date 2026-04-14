import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../backend/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

export default function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [bio, setBio] = useState(profile?.bio || "");
  const [skillInput, setSkillInput] = useState("");
  const [needInput, setNeedInput] = useState("");
  const [offered, setOffered] = useState<string[]>(profile?.skills_offered || []);
  const [needed, setNeeded] = useState<string[]>(profile?.skills_needed || []);
  const [saving, setSaving] = useState(false);

  const addSkill = (type: "offered" | "needed") => {
    const input = type === "offered" ? skillInput : needInput;
    const setter = type === "offered" ? setOffered : setNeeded;
    const current = type === "offered" ? offered : needed;
    if (input.trim() && !current.includes(input.trim().toLowerCase())) {
      setter([...current, input.trim().toLowerCase()]);
      type === "offered" ? setSkillInput("") : setNeedInput("");
    }
  };

  const removeSkill = (type: "offered" | "needed", skill: string) => {
    const setter = type === "offered" ? setOffered : setNeeded;
    const current = type === "offered" ? offered : needed;
    setter(current.filter((s) => s !== skill));
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        bio,
        skills_offered: offered,
        skills_needed: needed,
      });
      await refreshProfile();
      toast({ title: "Profile updated!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <h1 className="font-heading text-2xl font-bold">Your Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={profile?.displayName || ""} disabled className="bg-muted" />
          </div>
          <div>
            <Label>Bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell others about yourself..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Skills I Can Offer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              placeholder="e.g. JavaScript, Guitar, Spanish..."
              disabled={saving}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill("offered"))}
            />
            <Button variant="outline" onClick={() => addSkill("offered")} disabled={saving}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {offered.map((s) => (
              <Badge key={s} className="gap-1">
                {s}
                <button onClick={() => removeSkill("offered", s)} disabled={saving}><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Skills I Need</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={needInput}
              onChange={(e) => setNeedInput(e.target.value)}
              placeholder="e.g. Python, Piano, French..."
              disabled={saving}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill("needed"))}
            />
            <Button variant="outline" onClick={() => addSkill("needed")} disabled={saving}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {needed.map((s) => (
              <Badge key={s} variant="secondary" className="gap-1">
                {s}
                <button onClick={() => removeSkill("needed", s)} disabled={saving}><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? "Saving..." : "Save Profile"}
      </Button>
    </div>
  );
}
