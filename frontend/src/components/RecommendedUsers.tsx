import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import ReportModal from "@/components/ReportModal";
import SuggestionModal from "@/components/SuggestionModal";
import { calculateCompatibilityScore, skillMatches, computeBadges } from "@/lib/utils";
import { UserCardSkeleton } from "@/components/LoadingSkeletons";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { isRequestActive } from "@/lib/requestStatus";
import { getSkillCategory, categoryBadgeClasses } from "@/lib/skillCategories";
import { isProfilePublic } from "@/lib/profileVisibility";

interface CandidateSummary {
  userId: string;
  userName?: string;
  offered: Set<string>;
  needed: Set<string>;
  offeredCategories: Set<string>;
  neededCategories: Set<string>;
  count: number;
}

export default function RecommendedUsers({ limit = 6 }: { limit?: number }) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const navigate = useNavigate();
  const delayedLoading = useDelayedLoading(loading);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("skillbridge.savedRecommendations");
      if (raw) setSavedIds(JSON.parse(raw));
    } catch {
      // ignore localStorage parse failures
    }
  }, []);

  useEffect(() => {
    if (!profile || !user) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const loadRecommendations = async () => {
      setLoading(true);
      try {
        // get open requests (lightweight aggregation on requests, not full users scan)
        const q = query(collection(db, "requests"), where("status", "==", "open"));
        const snap = await getDocs(q);

        const map = new Map<string, CandidateSummary>();

        const myOffers = [ ...(profile.skills_offered || []), ...(profile.skills_offered_with_levels?.map((s: any) => s.skill) || []) ];
        const myNeeds = [ ...(profile.skills_needed || []), ...(profile.skills_needed_with_levels?.map((s: any) => s.skill) || []) ];

        // If profile lacks explicit skills, fallback to this user's open requests
        if (myOffers.length === 0 && myNeeds.length === 0) {
          try {
            const myReqSnap = await getDocs(query(collection(db, "requests"), where("userId", "==", user.uid), where("status", "==", "open")));
            for (const rd of myReqSnap.docs) {
              const rr = rd.data() as any;
              if (!isRequestActive(rr)) continue;
              if (rr.offer_skill) myOffers.push(rr.offer_skill);
              if (rr.need_skill) myNeeds.push(rr.need_skill);
            }
          } catch (e) {
            // ignore fallback failures
          }
        }

        const myOfferCategories = myOffers.map((skill: string) => getSkillCategory(skill));
        const myNeedCategories = myNeeds.map((skill: string) => getSkillCategory(skill));

        for (const d of snap.docs) {
          const r = d.data() as any;
          if (!r.userId || r.userId === user.uid) continue;
          if (!isRequestActive(r)) continue;
          // match if they offer what I need OR need what I offer
          const offersMatch = myNeeds.some((need: string) => r.offer_skill && skillMatches(r.offer_skill, need));
          const needsMatch = myOffers.some((offer: string) => r.need_skill && skillMatches(r.need_skill, offer));
          if (!offersMatch && !needsMatch) continue;

          const key = r.userId;
          const existing = map.get(key) || { userId: key, userName: r.userName || "", offered: new Set<string>(), needed: new Set<string>(), offeredCategories: new Set<string>(), neededCategories: new Set<string>(), count: 0 };
          if (r.offer_skill) existing.offered.add(r.offer_skill);
          if (r.need_skill) existing.needed.add(r.need_skill);
          if (r.offer_skill) existing.offeredCategories.add(getSkillCategory(r.offer_skill));
          if (r.need_skill) existing.neededCategories.add(getSkillCategory(r.need_skill));
          existing.count += 1;
          map.set(key, existing);
        }

        // convert to array, sort by count desc
        let arr = Array.from(map.values()).sort((a, b) => b.count - a.count || a.userName.localeCompare(b.userName));

        // limit number of profiles to fetch to avoid excessive reads
        arr = arr.slice(0, Math.max(limit, 12));

        const results: any[] = [];
        for (const candidate of arr.slice(0, limit)) {
          try {
            const userSnap = await getDoc(doc(db, "users", candidate.userId));
            const userProfile: any = { uid: candidate.userId, displayName: candidate.userName || userSnap.data()?.displayName || "User", rating: userSnap.data()?.rating || 0, availability_preferences: userSnap.data()?.availability_preferences || [], ...(userSnap.data() || {}) };

            // Skip if profile is private
            if (!isProfilePublic(userProfile)) {
              continue;
            }

            const compatibility = calculateCompatibilityScore(profile as any, userProfile as any);
            const categoryOverlap = [...candidate.offeredCategories].filter((cat) => myNeedCategories.includes(cat as any)).length + [...candidate.neededCategories].filter((cat) => myOfferCategories.includes(cat as any)).length;

            results.push({
              id: candidate.userId,
              name: userProfile.displayName,
              avatar: userProfile.photoURL || "",
              offered: Array.from(candidate.offered),
              needed: Array.from(candidate.needed),
              offeredCategories: Array.from(candidate.offeredCategories),
              neededCategories: Array.from(candidate.neededCategories),
              count: candidate.count,
              compatibility: Math.min(100, compatibility + categoryOverlap * 4),
              rating: userProfile.rating || 0,
              availability: userProfile.availability_preferences || [],
            });
          } catch (err) {
            // ignore user load failures for a single candidate
            console.warn("Failed loading user profile for recommendation", candidate.userId, err);
          }
        }

        if (mounted) {
          // sort by compatibility then count
          results.sort((a, b) => b.compatibility - a.compatibility || b.count - a.count);
          setCandidates(results.slice(0, limit));
        }
      } catch (err) {
        console.error("Error computing recommendations", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadRecommendations();

    return () => { mounted = false; };
  }, [profile, user, limit]);

  const viewProfile = (_name: string) => {
    navigate("/discover");
  };

  const toggleSaved = (id: string) => {
    setSavedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((savedId) => savedId !== id) : [...prev, id];
      try {
        localStorage.setItem("skillbridge.savedRecommendations", JSON.stringify(next));
      } catch {
        // ignore localStorage write failures
      }
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg">Recommended Users</CardTitle>
      </CardHeader>
      <CardContent>
        {delayedLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: limit || 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-3 bg-muted animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted-foreground/20 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-muted-foreground/20 rounded" />
                    <div className="h-3 w-32 bg-muted-foreground/20 rounded" />
                  </div>
                </div>
                <div className="flex gap-1">
                  <div className="h-6 w-16 rounded-full bg-muted-foreground/20" />
                  <div className="h-6 w-20 rounded-full bg-muted-foreground/20" />
                </div>
              </div>
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recommendations right now. Try completing your profile or posting requests.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {candidates.map((c) => (
              <div key={c.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                        {c.name ? c.name.split(" ").map((s:any)=>s[0]).slice(0,2).join("") : "U"}
                      </div>
                      <div>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.offered.join(", ")}</div>
                        <div className="mt-1 flex gap-2">
                          {computeBadges({
                            exchanges_completed: c.exchanges || 0,
                            rating: c.rating || 0,
                            skills_offered: c.offered || [],
                            skills_needed: c.needed || [],
                          }).filter(b => b.earned).slice(0,2).map(b => (
                            <div key={b.id} className="text-[12px] flex items-center gap-1 text-muted-foreground">
                              <span>{b.icon}</span>
                              <span className="hidden sm:inline">{b.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{c.compatibility}%</div>
                    <div className="text-xs text-muted-foreground">Compatible</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {c.offered.map((s:any, index: number) => (
                    <Badge key={`${c.id}_offered_${index}_${s}`} variant="outline">{s}</Badge>
                  ))}
                </div>

                {(c.offeredCategories.length > 0 || c.neededCategories.length > 0) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {c.offeredCategories.slice(0, 2).map((category: string) => (
                      <Badge key={`${c.id}_offered_category_${category}`} variant="outline" className={`rounded-full text-[10px] uppercase tracking-wide ${categoryBadgeClasses(category as any)}`}>
                        {category}
                      </Badge>
                    ))}
                    {c.neededCategories.slice(0, 2).map((category: string) => (
                      <Badge key={`${c.id}_needed_category_${category}`} variant="secondary" className={`rounded-full text-[10px] uppercase tracking-wide ${categoryBadgeClasses(category as any)}`}>
                        {category}
                      </Badge>
                    ))}
                  </div>
                )}

                {c.needed.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {c.needed.slice(0, 3).map((s:any, index: number) => (
                      <Badge key={`${c.id}_needed_${index}_${s}`} variant="secondary">Needs: {s}</Badge>
                    ))}
                  </div>
                )}

                {c.availability.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {c.availability.slice(0, 3).map((slot: string, index: number) => (
                      <Badge key={`${c.id}_availability_${index}_${slot}`} className="text-[11px]" variant="secondary">{slot}</Badge>
                    ))}
                  </div>
                )}

                <div className="mt-3">
                  <Progress value={Math.max(0, Math.min(100, c.compatibility))} className="h-1.5" />
                </div>

                  <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">Rating: {c.rating.toFixed(1)} ⭐</div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => viewProfile(c.name)}>View Profile</Button>
                    <Button size="sm" onClick={() => navigate('/matches')}>Explore Match</Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleSaved(c.id)}>
                      {savedIds.includes(c.id) ? "Saved" : "Save"}
                    </Button>                      <SuggestionModal
                        type="greeting"
                        userName={c.name}
                        mySkill={c.offered[0]}
                        theirSkill={c.needed[0]}
                        tone="friendly"
                      />                    <ReportModal targetType="user" targetId={c.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
