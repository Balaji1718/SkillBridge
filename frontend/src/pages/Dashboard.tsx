import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PlusCircle, Repeat2, Star, BookOpen, Flame, ArrowUpRight } from "lucide-react";
import { normalizeSkill } from "@/lib/utils";
import RecommendedUsers from "@/components/RecommendedUsers";
import AchievementBadge from "@/components/AchievementBadge";
import PersonalAnalytics from "@/components/PersonalAnalytics";
import { computeBadges } from "@/lib/utils";

interface RequestRecord {
  need_skill?: string;
  offer_skill?: string;
  title?: string;
  category?: string;
  status?: string;
}

interface SkillTrend {
  key: string;
  label: string;
  count: number;
  category: string;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [loadingTrends, setLoadingTrends] = useState(true);
  const [topRequestedSkills, setTopRequestedSkills] = useState<SkillTrend[]>([]);
  const [topOfferedSkills, setTopOfferedSkills] = useState<SkillTrend[]>([]);

  const stats = [
    { label: "Skills Offered", value: profile?.skills_offered?.length || 0, icon: BookOpen, color: "text-primary" },
    { label: "Skills Needed", value: profile?.skills_needed?.length || 0, icon: Repeat2, color: "text-accent" },
    { label: "Exchanges", value: profile?.exchanges_completed || 0, icon: Star, color: "text-success" },
    { label: "Rating", value: profile?.rating ? profile.rating.toFixed(1) : "N/A", icon: Star, color: "text-accent" },
  ];

  useEffect(() => {
    let mounted = true;

    const loadTrendingSkills = async () => {
      try {
        const snapshot = await getDocs(collection(db, "requests"));
        const requestedMap = new Map<string, SkillTrend>();
        const offeredMap = new Map<string, SkillTrend>();

        const upsertTrend = (
          map: Map<string, SkillTrend>,
          rawSkill: string | undefined,
          category: string,
          fallbackLabel: string
        ) => {
          if (!rawSkill) return;
          const trimmedSkill = rawSkill.trim();
          if (!trimmedSkill) return;

          const key = normalizeSkill(trimmedSkill);
          if (!key) return;

          const existing = map.get(key);
          if (existing) {
            existing.count += 1;
            return;
          }

          map.set(key, {
            key,
            label: trimmedSkill,
            count: 1,
            category: category || fallbackLabel,
          });
        };

        snapshot.docs.forEach((requestDoc) => {
          const request = requestDoc.data() as RequestRecord;
          if (request.status && request.status !== "open") return;

          upsertTrend(requestedMap, request.need_skill, request.category || "Requested", "Requested");
          upsertTrend(offeredMap, request.offer_skill, request.category || "Offered", "Offered");
        });

        const sortTrends = (items: SkillTrend[]) =>
          items.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

        if (mounted) {
          setTopRequestedSkills(sortTrends(Array.from(requestedMap.values())).slice(0, 6));
          setTopOfferedSkills(sortTrends(Array.from(offeredMap.values())).slice(0, 6));
        }
      } catch (error) {
        console.error("Error loading trending skills:", error);
      } finally {
        if (mounted) setLoadingTrends(false);
      }
    };

    loadTrendingSkills();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold">Welcome, {profile?.displayName || "Student"} 👋</h1>
        <p className="text-muted-foreground mt-1">Ready to exchange skills today?</p>
      </div>
      {/* Achievements */}
      <div>
        <div className="mt-3">
          <h2 className="text-sm font-medium">Achievements</h2>
          <div className="mt-2">
            {profile ? (
              <div className="flex flex-wrap gap-3">
                {computeBadges(profile).filter(b => b.earned).slice(0,6).map(b => (
                  <AchievementBadge key={b.id} id={b.id} title={b.title} description={b.description} icon={b.icon} earned={b.earned} small />
                ))}
                {computeBadges(profile).every(b => !b.earned) && (
                  <p className="text-sm text-muted-foreground">No badges earned yet. Complete your profile or make your first exchange.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sign in to earn badges.</p>
            )}
          </div>
        </div>
      </div>

      {/* Personal Analytics */}
      {profile && <PersonalAnalytics profile={profile} compact />}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4 flex flex-col items-center text-center">
              <s.icon className={`h-6 w-6 mb-2 ${s.color}`} />
              <p className="text-2xl font-bold font-heading">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-primary" />
              Post a Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Tell the community what you need and what you can offer in return.
            </p>
            <Link to="/create-request">
              <Button size="sm">Create Request</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Repeat2 className="h-5 w-5 text-accent" />
              Find Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Discover students who need your skills and can teach you what you need.
            </p>
            <Link to="/matches">
              <Button size="sm" variant="outline">Browse Matches</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recommended users */}
      <RecommendedUsers />

      {/* Trending skills */}
      <Card className="overflow-hidden border-primary/15 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-primary/10 via-background to-accent/10 border-b border-border/60">
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <Flame className="h-5 w-5 text-accent" />
            Trending Skills
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Lightweight platform-wide aggregation from recent requests.
          </p>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-heading text-base font-semibold">Most Requested</h3>
                  <p className="text-xs text-muted-foreground">Skills people want to learn</p>
                </div>
                <Badge variant="secondary" className="rounded-full">Top demand</Badge>
              </div>

              {loadingTrends ? (
                <div className="space-y-3">
                  <div className="h-10 rounded-lg bg-muted animate-pulse" />
                  <div className="h-10 rounded-lg bg-muted animate-pulse" />
                  <div className="h-10 rounded-lg bg-muted animate-pulse" />
                </div>
              ) : topRequestedSkills.length === 0 ? (
                <p className="text-sm text-muted-foreground">No request trends yet.</p>
              ) : (
                <div className="space-y-3">
                  {topRequestedSkills.map((skill, index) => (
                    <div key={skill.key} className="rounded-lg border bg-background/60 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold">{skill.label}</span>
                            <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-wide">
                              {skill.category || "General"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">Requested by the community</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">{skill.count}</div>
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">mentions</div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <Progress value={Math.max(18, 100 - index * 16)} className="h-1.5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-heading text-base font-semibold">Most Offered</h3>
                  <p className="text-xs text-muted-foreground">Skills people are teaching</p>
                </div>
                <Badge variant="secondary" className="rounded-full">Top supply</Badge>
              </div>

              {loadingTrends ? (
                <div className="space-y-3">
                  <div className="h-10 rounded-lg bg-muted animate-pulse" />
                  <div className="h-10 rounded-lg bg-muted animate-pulse" />
                  <div className="h-10 rounded-lg bg-muted animate-pulse" />
                </div>
              ) : topOfferedSkills.length === 0 ? (
                <p className="text-sm text-muted-foreground">No offer trends yet.</p>
              ) : (
                <div className="space-y-3">
                  {topOfferedSkills.map((skill, index) => (
                    <div key={skill.key} className="rounded-lg border bg-background/60 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold">{skill.label}</span>
                            <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-wide">
                              {skill.category || "General"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">Offered by the community</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-accent">{skill.count}</div>
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">mentions</div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <Progress value={Math.max(18, 100 - index * 16)} className="h-1.5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-dashed px-4 py-3 text-xs text-muted-foreground">
            <span>Aggregated from the current requests collection.</span>
            <span className="inline-flex items-center gap-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              No realtime listeners
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
