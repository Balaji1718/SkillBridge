import { useState } from "react";
import { useAuth, SkillWithLevel, SkillLevel } from "@/contexts/AuthContext";
import { deleteField, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, X, Globe, Eye, EyeOff } from "lucide-react";
import { getProfileVisibility, ProfileVisibility } from "@/lib/profileVisibility";
import AchievementBadge from "@/components/AchievementBadge";
import PersonalAnalytics from "@/components/PersonalAnalytics";
import SkillAutocomplete from "@/components/SkillAutocomplete";
import RatingSummaryCard from "@/components/RatingSummaryCard";
import { computeBadges } from "@/lib/utils";
import AIEnhanceDialog from "@/components/AIEnhanceDialog";
import { ProfileSkeleton } from "@/components/LoadingSkeletons";

const availabilityOptions = [
  "Weekdays",
  "Weekends",
  "Evenings",
  "Mornings",
  "Online Only",
  "Flexible Schedule",
];

export default function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [bio, setBio] = useState(profile?.bio || "");
  const [skillInput, setSkillInput] = useState("");
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("beginner");
  const [needInput, setNeedInput] = useState("");
  const [needLevel, setNeedLevel] = useState<SkillLevel>("beginner");
  const [offered, setOffered] = useState<SkillWithLevel[]>(
    profile?.skills_offered_with_levels || []
  );
  const [needed, setNeeded] = useState<SkillWithLevel[]>(
    profile?.skills_needed_with_levels || []
  );
  const [availability, setAvailability] = useState<string[]>(
    profile?.availability_preferences || []
  );
  const [visibility, setVisibility] = useState<ProfileVisibility>(
    getProfileVisibility(profile) as ProfileVisibility
  );
  const [saving, setSaving] = useState(false);
  const [bioAiOpen, setBioAiOpen] = useState(false);

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto py-8 animate-fade-in">
        <ProfileSkeleton />
      </div>
    );
  }

  const addSkill = (type: "offered" | "needed", skillValue?: string) => {
    const input = skillValue || (type === "offered" ? skillInput : needInput);
    const level = type === "offered" ? skillLevel : needLevel;
    const setter = type === "offered" ? setOffered : setNeeded;
    const current = type === "offered" ? offered : needed;
    
    if (input.trim()) {
      const normalizedSkill = input.trim().toLowerCase();
      if (!current.some((s) => s.skill === normalizedSkill)) {
        setter([...current, { skill: normalizedSkill, level }]);
        type === "offered" ? setSkillInput("") : setNeedInput("");
      }
    }
  };

  const removeSkill = (type: "offered" | "needed", skill: string) => {
    const setter = type === "offered" ? setOffered : setNeeded;
    const current = type === "offered" ? offered : needed;
    setter(current.filter((s) => s.skill !== skill));
  };

  const getLevelColor = (level: SkillLevel) => {
    switch (level) {
      case "beginner":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case "intermediate":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100";
      case "advanced":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100";
    }
  };

  const toggleAvailability = (option: string) => {
    setAvailability((current) =>
      current.includes(option)
        ? current.filter((value) => value !== option)
        : [...current, option]
    );
  };

  const bioStarterText = [
    `Name: ${profile?.displayName || "SkillBridge member"}`,
    `I am a SkillBridge member who wants a clear, friendly, and professional introduction.`,
    offered.length > 0
      ? `Skills I can offer: ${offered.map((item) => item.skill).join(", ")}.`
      : "Skills I can offer: none listed yet.",
    needed.length > 0
      ? `Skills I want to learn: ${needed.map((item) => item.skill).join(", ")}.`
      : "Skills I want to learn: none listed yet.",
    availability.length > 0
      ? `Availability: ${availability.join(", ")}.`
      : "Availability: flexible or not specified.",
  ].join("\n");

  const calculateCompletionPercentage = (): number => {
    let completed = 0;
    const total = 4;

    // Check if display name is filled
    if (profile?.displayName && profile.displayName.trim()) {
      completed += 1;
    }

    // Check if bio is filled
    if (bio.trim()) {
      completed += 1;
    }

    // Check if skills offered has at least one
    if (offered.length > 0) {
      completed += 1;
    }

    // Check if skills needed has at least one
    if (needed.length > 0) {
      completed += 1;
    }

    return Math.round((completed / total) * 100);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Also create legacy format for backward compatibility
      const legacyOffered = offered.map((s) => s.skill);
      const legacyNeeded = needed.map((s) => s.skill);

      await updateDoc(doc(db, "users", user.uid), {
        bio,
        skills_offered: legacyOffered,
        skills_needed: legacyNeeded,
        skills_offered_with_levels: offered,
        skills_needed_with_levels: needed,
        availability_preferences: availability.length > 0 ? availability : deleteField(),
        visibility, // Add visibility field
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

      {/* Achievement badges */}
      <div>
        <h2 className="text-sm font-medium">Achievements</h2>
        <div className="mt-2">
          {profile ? (
            <div className="flex flex-wrap gap-3">
              {computeBadges(profile).map((b) => (
                <div key={b.id} className="w-full sm:w-auto">
                  <AchievementBadge id={b.id} title={b.title} description={b.description} icon={b.icon} earned={b.earned} small />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No achievements yet.</p>
          )}
        </div>
      </div>

      {/* Personal Analytics */}
      {profile && <PersonalAnalytics profile={profile} />}

      {/* Reviews & Ratings */}
      {profile && user && (
        <RatingSummaryCard
          userId={user.uid}
          userName={profile.displayName}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Profile Completion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              {calculateCompletionPercentage()}% Complete
            </span>
          </div>
          <Progress value={calculateCompletionPercentage()} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Fill in your bio, add skills you can offer, and skills you need to complete your profile.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="font-heading text-lg">About</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBioAiOpen(true)}
              className="shrink-0"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Improve with AI
            </Button>
          </div>
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

      <AIEnhanceDialog
        open={bioAiOpen}
        onOpenChange={setBioAiOpen}
        mode="bio"
        sourceText={bio || profile?.bio || ""}
        starterText={!bio.trim() ? bioStarterText : undefined}
        title="Improve my bio with AI"
        description="Rewrite your bio to sound clearer, more professional, and easier for other users to trust. You choose whether to apply it."
        sourceLabel="Current bio"
        applyLabel="Apply bio"
        onApply={(value) => setBio(value)}
      />

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Profile Visibility</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Control who can see your profile and discover you on SkillBridge.
          </p>
          <div className="space-y-3">
            <div
              onClick={() => setVisibility("public")}
              className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                visibility === "public"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-primary/50"
              }`}
            >
              <Globe className="h-5 w-5 mt-0.5 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">Public Profile</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Appear in Discover, Recommendations, and Search. Get more matches.
                </p>
              </div>
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === "public"}
                onChange={() => setVisibility("public")}
                className="mt-1 h-4 w-4"
              />
            </div>

            <div
              onClick={() => setVisibility("private")}
              className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                visibility === "private"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-primary/50"
              }`}
            >
              <EyeOff className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">Private Profile</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Hidden from public discovery. You can still access your profile and active requests.
                </p>
              </div>
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={visibility === "private"}
                onChange={() => setVisibility("private")}
                className="mt-1 h-4 w-4"
              />
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
              💡 {visibility === "public"
                ? "Your profile is visible to all users. You'll appear in discovery and recommendations."
                : "Your profile is hidden from discovery. Only you can see it."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Availability Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Select the times that work best for your skill exchanges.
          </p>
          <div className="flex flex-wrap gap-2">
            {availabilityOptions.map((option) => {
              const selected = availability.includes(option);
              return (
                <Button
                  key={option}
                  type="button"
                  variant={selected ? "default" : "outline"}
                  onClick={() => toggleAvailability(option)}
                  className="rounded-full"
                  aria-pressed={selected}
                >
                  {option}
                </Button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {availability.length > 0 ? (
              availability.map((option) => (
                <Badge key={option} variant="secondary" className="rounded-full px-3 py-1">
                  {option}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No availability selected yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Skills I Can Offer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <SkillAutocomplete
              value={skillInput}
              onChange={setSkillInput}
              onSelect={(skill) => {
                // Pass the selected skill directly to addSkill
                addSkill("offered", skill);
              }}
              placeholder="e.g. JavaScript, Guitar, Spanish..."
              className="flex-1 min-w-32"
            />
            <Select value={skillLevel} onValueChange={(val) => setSkillLevel(val as SkillLevel)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => addSkill("offered")}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {offered.map((s) => (
              <Badge key={s.skill} className={`gap-1 ${getLevelColor(s.level)}`}>
                <span className="font-medium">{s.skill}</span>
                <span className="text-xs opacity-75">({s.level})</span>
                <button onClick={() => removeSkill("offered", s.skill)}>
                  <X className="h-3 w-3" />
                </button>
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
          <div className="flex gap-2 flex-wrap">
            <SkillAutocomplete
              value={needInput}
              onChange={setNeedInput}
              onSelect={(skill) => {
                // Pass the selected skill directly to addSkill
                addSkill("needed", skill);
              }}
              placeholder="e.g. Python, Piano, French..."
              className="flex-1 min-w-32"
            />
            <Select value={needLevel} onValueChange={(val) => setNeedLevel(val as SkillLevel)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => addSkill("needed")}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {needed.map((s) => (
              <Badge key={s.skill} variant="secondary" className={`gap-1 ${getLevelColor(s.level)}`}>
                <span className="font-medium">{s.skill}</span>
                <span className="text-xs opacity-75">({s.level})</span>
                <button onClick={() => removeSkill("needed", s.skill)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} loading={saving} className="w-full">
        Save Profile
      </Button>
    </div>
  );
}
