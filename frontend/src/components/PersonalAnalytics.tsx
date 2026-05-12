import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { computePersonalAnalytics } from "@/lib/utils";
import { collection, getDocs, query, where } from "firebase/firestore";
import { BookOpen, BarChart3, Trophy, TrendingUp, Calendar, Target, Activity, GitPullRequest } from "lucide-react";

interface PersonalAnalyticsProps {
  profile: any;
  compact?: boolean;
}

export default function PersonalAnalytics({ profile, compact = false }: PersonalAnalyticsProps) {
  const { user } = useAuth();
  const analytics = computePersonalAnalytics(profile);
  const [requestsCreated, setRequestsCreated] = useState(0);
  const [activeMatches, setActiveMatches] = useState(0);
  const [recentActivitySummary, setRecentActivitySummary] = useState("No recent activity yet.");
  const [monthlyTrend, setMonthlyTrend] = useState<number[]>([0, 0, 0, 0, 0, 0]);

  const maxTrendValue = useMemo(() => Math.max(1, ...monthlyTrend), [monthlyTrend]);

  useEffect(() => {
    if (!user?.uid) {
      setRequestsCreated(0);
      setActiveMatches(0);
      setRecentActivitySummary("No recent activity yet.");
      setMonthlyTrend([0, 0, 0, 0, 0, 0]);
      return;
    }

    let mounted = true;

    const cacheKey = `skillbridge.personalAnalytics.${user.uid}`;
    const cacheTtlMs = 120000; // 2 minutes

    const hydrateFromCache = () => {
      try {
        const raw = sessionStorage.getItem(cacheKey);
        if (!raw) return false;
        const parsed = JSON.parse(raw) as {
          ts: number;
          requestsCreated: number;
          activeMatches: number;
          recentActivitySummary: string;
          monthlyTrend: number[];
        };
        if (!parsed?.ts || Date.now() - parsed.ts > cacheTtlMs) return false;
        if (!mounted) return true;
        setRequestsCreated(parsed.requestsCreated || 0);
        setActiveMatches(parsed.activeMatches || 0);
        setRecentActivitySummary(parsed.recentActivitySummary || "No recent activity yet.");
        setMonthlyTrend(parsed.monthlyTrend?.length === 6 ? parsed.monthlyTrend : [0, 0, 0, 0, 0, 0]);
        return true;
      } catch {
        return false;
      }
    };

    const loadUserAnalytics = async () => {
      if (hydrateFromCache()) return;

      try {
        const requestsSnap = await getDocs(query(collection(db, "requests"), where("userId", "==", user.uid)));
        const totalRequests = requestsSnap.size;

        const toDate = (value: any): Date | null => {
          if (!value) return null;
          try {
            if (value?.seconds) return new Date(value.seconds * 1000);
            return new Date(value);
          } catch {
            return null;
          }
        };

        const months = [0, 0, 0, 0, 0, 0];
        const now = new Date();
        const reqRecords = requestsSnap.docs.map((docItem) => ({ id: docItem.id, ...(docItem.data() as any) }));
        reqRecords.forEach((request) => {
          const created = toDate(request.createdAt);
          if (!created) return;
          const monthDiff = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
          if (monthDiff >= 0 && monthDiff < 6) {
            months[5 - monthDiff] += 1;
          }
        });

        const [matchesAsUserA, matchesAsUserB] = await Promise.all([
          getDocs(query(collection(db, "matches"), where("userA", "==", user.uid))),
          getDocs(query(collection(db, "matches"), where("userB", "==", user.uid))),
        ]);

        const activeStatus = new Set(["pending", "accepted", "in_progress", "active"]);
        const allMatches = [
          ...matchesAsUserA.docs.map((docItem) => docItem.data() as any),
          ...matchesAsUserB.docs.map((docItem) => docItem.data() as any),
        ];
        const activeMatchCount = allMatches.filter((match) => activeStatus.has((match.status || "").toLowerCase())).length;

        const latestRequest = reqRecords
          .map((request) => ({ ...request, createdDate: toDate(request.createdAt) }))
          .filter((request) => request.createdDate)
          .sort((a, b) => (b.createdDate as Date).getTime() - (a.createdDate as Date).getTime())[0];

        let summary = "No recent activity yet.";
        if (latestRequest && activeMatchCount > 0) {
          summary = `You have ${activeMatchCount} active match${activeMatchCount === 1 ? "" : "es"} and your latest request is \"${latestRequest.title || "Untitled request"}\".`;
        } else if (latestRequest) {
          summary = `Latest activity: posted \"${latestRequest.title || "Untitled request"}\".`;
        } else if (activeMatchCount > 0) {
          summary = `You currently have ${activeMatchCount} active match${activeMatchCount === 1 ? "" : "es"}.`;
        }

        if (!mounted) return;

        setRequestsCreated(totalRequests);
        setActiveMatches(activeMatchCount);
        setRecentActivitySummary(summary);
        setMonthlyTrend(months);

        try {
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({
              ts: Date.now(),
              requestsCreated: totalRequests,
              activeMatches: activeMatchCount,
              recentActivitySummary: summary,
              monthlyTrend: months,
            })
          );
        } catch {
          // ignore cache write failures
        }
      } catch {
        if (!mounted) return;
        setRecentActivitySummary("Analytics are temporarily unavailable.");
      }
    };

    loadUserAnalytics();

    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  if (compact) {
    // Compact version for Dashboard or inline display
    return (
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Your Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Profile Completion */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Profile Completion</span>
              </div>
              <span className="text-sm font-bold text-primary">{analytics.profileCompletion}%</span>
            </div>
            <Progress value={analytics.profileCompletion} className="h-2" />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border bg-background/60 p-2 text-center">
              <div className="text-xl font-bold text-primary">{analytics.totalSkills}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Skills</div>
            </div>
            <div className="rounded-lg border bg-background/60 p-2 text-center">
              <div className="text-xl font-bold text-accent">{requestsCreated}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Requests</div>
            </div>
            <div className="rounded-lg border bg-background/60 p-2 text-center">
              <div className="text-xl font-bold text-success">{activeMatches}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Active</div>
            </div>
          </div>

          <div className="rounded-lg border bg-background/60 p-2">
            <div className="flex items-center gap-1 mb-1">
              <Activity className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Recent Activity</span>
            </div>
            <p className="text-xs line-clamp-2">{recentActivitySummary}</p>
          </div>

          {/* Rating and Account Age */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border bg-background/60 p-2">
              <div className="flex items-center gap-1">
                <Trophy className="h-3 w-3 text-yellow-500" />
                <span className="text-xs text-muted-foreground">Rating</span>
              </div>
              <div className="text-lg font-bold">{analytics.averageRating.toFixed(1)} ⭐</div>
            </div>
            <div className="rounded-lg border bg-background/60 p-2">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Member</span>
              </div>
              <div className="text-xs font-bold capitalize">{analytics.accountAgeTier}</div>
            </div>
          </div>

          {/* Top Skills */}
          {(analytics.topOfferedSkills.length > 0 || analytics.topNeededSkills.length > 0) && (
            <div className="space-y-2 pt-2 border-t">
              {analytics.topOfferedSkills.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3 text-green-500" />
                    <span className="text-xs font-medium text-muted-foreground">Top Offered</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {analytics.topOfferedSkills.map((skill) => (
                      <Badge key={skill} variant="outline" className="text-[10px]">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {analytics.topNeededSkills.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-blue-500" />
                    <span className="text-xs font-medium text-muted-foreground">Top Needed</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {analytics.topNeededSkills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-[10px]">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">6-Month Trend</span>
            </div>
            <div className="grid grid-cols-6 gap-1 h-12 items-end">
              {monthlyTrend.map((value, index) => (
                <div
                  key={`trend-${index}`}
                  className="rounded-sm bg-primary/70"
                  style={{ height: `${Math.max(10, Math.round((value / maxTrendValue) * 100))}%` }}
                  title={`${value} request${value === 1 ? "" : "s"}`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full version for Profile page
  return (
    <div className="space-y-4">
      {/* Profile Completion Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Profile Completion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Overall Progress</span>
              <span className="text-sm font-bold text-primary">{analytics.profileCompletion}%</span>
            </div>
            <Progress value={analytics.profileCompletion} className="h-3" />
          </div>
          <p className="text-xs text-muted-foreground">
            {analytics.profileCompletion === 100
              ? "Your profile is complete! You're all set to find great matches."
              : "Complete your profile to improve your chances of finding compatible partners."}
          </p>
        </CardContent>
      </Card>

      {/* Analytics Overview Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-primary" />
              Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="rounded-lg border bg-background/60 p-4 text-center">
              <div className="text-3xl font-bold text-primary">{requestsCreated}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Created</div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {requestsCreated === 0 ? "Create your first request to start matching." : "Your requests are fueling your skill growth."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent" />
              Active Matches
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="rounded-lg border bg-background/60 p-4 text-center">
              <div className="text-3xl font-bold text-accent">{activeMatches}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">In Progress</div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {activeMatches === 0 ? "No active matches yet." : "Keep the momentum going with your current matches."}
            </p>
          </CardContent>
        </Card>

        {/* Skills Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Skills
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border bg-background/60 p-2 text-center">
                <div className="text-xl font-bold text-green-500">{analytics.skillsOffered}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Offered</div>
              </div>
              <div className="rounded-lg border bg-background/60 p-2 text-center">
                <div className="text-xl font-bold text-blue-500">{analytics.skillsNeeded}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Needed</div>
              </div>
            </div>
            <div className="text-sm font-semibold text-center pt-1 border-t">
              Total: <span className="text-primary">{analytics.totalSkills}</span> skills
            </div>
          </CardContent>
        </Card>

        {/* Exchanges Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              Exchanges
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="rounded-lg border bg-background/60 p-4 text-center">
              <div className="text-3xl font-bold text-accent">{analytics.exchangesCompleted}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Completed</div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {analytics.exchangesCompleted === 0
                ? "Start your first exchange to build your reputation"
                : `Great work! You're an active collaborator.`}
            </p>
          </CardContent>
        </Card>

        {/* Rating Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Rating
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="rounded-lg border bg-background/60 p-4 text-center">
              <div className="text-3xl font-bold text-yellow-500">
                {analytics.averageRating.toFixed(1)} ⭐
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                {analytics.exchangesCompleted === 0 ? "No Ratings Yet" : "Average Rating"}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {analytics.averageRating >= 4.7 ? "🌟 You're a top-rated mentor!" : "Keep delivering great exchanges!"}
            </div>
          </CardContent>
        </Card>

        {/* Achievements Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="rounded-lg border bg-background/60 p-4 text-center">
              <div className="text-3xl font-bold text-primary">{analytics.achievementCount}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Badges Earned</div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {analytics.achievementCount === 0 ? "Earn badges by completing activities" : "Keep up the great work!"}
            </p>
          </CardContent>
        </Card>

        {/* Account Tenure Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Tenure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="rounded-lg border bg-background/60 p-4 text-center">
              <div className="text-2xl font-bold">{analytics.accountAgeInDays}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Days</div>
            </div>
            <div className="text-xs text-center">
              <Badge className="capitalize">{analytics.accountAgeTier} Member</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Skills Detailed Section */}
      {(analytics.topOfferedSkills.length > 0 || analytics.topNeededSkills.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading">Your Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.topOfferedSkills.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-green-500" />
                  Top Skills You Offer
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analytics.topOfferedSkills.map((skill) => (
                    <Badge key={skill} variant="outline" className="text-sm">
                      ✓ {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {analytics.topNeededSkills.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  Top Skills You Want to Learn
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analytics.topNeededSkills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-sm">
                      → {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Recent Activity Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">{recentActivitySummary}</p>

          <div>
            <div className="text-xs text-muted-foreground mb-2">Monthly Requests Trend (Last 6 Months)</div>
            <div className="grid grid-cols-6 gap-2 h-16 items-end">
              {monthlyTrend.map((value, index) => (
                <div key={`trend-full-${index}`} className="space-y-1">
                  <div
                    className="w-full rounded-sm bg-primary/80"
                    style={{ height: `${Math.max(8, Math.round((value / maxTrendValue) * 100))}%` }}
                    title={`${value} request${value === 1 ? "" : "s"}`}
                  />
                  <div className="text-[10px] text-center text-muted-foreground">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
