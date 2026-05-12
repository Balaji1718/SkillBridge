import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { calculateCompatibilityScore, calculateProfileCompletion, normalizeSkill } from "@/lib/utils";
import { Repeat2, Search } from "lucide-react";
import RecommendedUsers from "@/components/RecommendedUsers";

interface SkillRequest {
  id: string;
  userId: string;
  userName: string;
  title: string;
  description: string;
  need_skill: string;
  offer_skill: string;
  status: string;
  createdAt?: { seconds?: number; nanoseconds?: number };
}

interface UserProfile {
  uid: string;
  displayName: string;
  bio: string;
  skills_offered?: string[];
  skills_offered_with_levels?: Array<{ skill: string; level: string }>;
  skills_needed?: string[];
  skills_needed_with_levels?: Array<{ skill: string; level: string }>;
  rating: number;
  exchanges_completed?: number;
  availability_preferences?: string[];
}

interface Match {
  id: string;
  requestA: SkillRequest;
  requestB: SkillRequest;
  status: string;
  compatibilityScore: number;
  matchedUser: UserProfile;
  matchedProfileCompletion: number;
  matchedRating: number;
  recentActivityScore: number;
}

export default function MatchesPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [myRequests, setMyRequests] = useState<SkillRequest[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    loadMyRequests();
  }, [user]);

  const loadMyRequests = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, "requests"), where("userId", "==", user.uid));
      const snap = await getDocs(q);
      setMyRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SkillRequest)));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const findMatches = async () => {
    if (!user || myRequests.length === 0) {
      toast({ title: "No requests", description: "Create a request first!", variant: "destructive" });
      return;
    }
    setSearching(true);
    setHasSearched(true);
    const foundMatches: Match[] = [];
    const userProfileCache = new Map<string, UserProfile>();

    const getRecentActivityScore = (createdAt?: { seconds?: number }) => {
      if (!createdAt?.seconds) return 0;
      const ageDays = (Date.now() - createdAt.seconds * 1000) / (1000 * 60 * 60 * 24);
      if (ageDays <= 3) return 2;
      if (ageDays <= 14) return 1;
      return 0;
    };

    try {
      const isMatch = (leftNeed: string, rightOffer: string, leftOffer: string, rightNeed: string) => {
        const normalizedLeftNeed = normalizeSkill(leftNeed);
        const normalizedRightOffer = normalizeSkill(rightOffer);
        const normalizedLeftOffer = normalizeSkill(leftOffer);
        const normalizedRightNeed = normalizeSkill(rightNeed);

        const forwardMatch = normalizedLeftNeed === normalizedRightOffer;
        const reverseMatch = normalizedLeftOffer === normalizedRightNeed;

        return forwardMatch && reverseMatch;
      };

      // Reuse in-memory auth profile first, then fall back to Firestore once.
      let currentUserProfile: UserProfile;
      if (profile) {
        currentUserProfile = profile as UserProfile;
      } else {
        const userDocSnap = await getDoc(doc(db, "users", user.uid));
        currentUserProfile = {
          uid: user.uid,
          displayName: user.displayName || "You",
          bio: "",
          rating: 0,
          ...(userDocSnap.data() as Partial<UserProfile>),
        };
      }

      userProfileCache.set(user.uid, currentUserProfile);

      const allOpenRequestsSnap = await getDocs(query(collection(db, "requests"), where("status", "==", "open")));
      const allOpenRequests = allOpenRequestsSnap.docs.map((requestDoc) => ({
        id: requestDoc.id,
        ...requestDoc.data(),
      } as SkillRequest));

      for (const myReq of myRequests) {
        if (myReq.status !== "open") continue;
        // Find requests where someone offers what I need AND needs what I offer.
        const matchingRequests = allOpenRequests.filter((otherReq) => {
          if (otherReq.userId === user.uid) return false;
          return isMatch(myReq.need_skill, otherReq.offer_skill, myReq.offer_skill, otherReq.need_skill);
        });

        console.debug("[Feature 6] matches for request", {
          requestId: myReq.id,
          need_skill: myReq.need_skill,
          offer_skill: myReq.offer_skill,
          matchedRequestIds: matchingRequests.map((request) => request.id),
        });

        for (const otherReq of matchingRequests) {
          if (otherReq.userId === user.uid) continue;

          // Fetch each matched user's profile at most once.
          let otherUserProfile = userProfileCache.get(otherReq.userId);
          if (!otherUserProfile) {
            const otherUserDocSnap = await getDoc(doc(db, "users", otherReq.userId));
            otherUserProfile = {
              uid: otherReq.userId,
              displayName: otherReq.userName,
              bio: "",
              rating: 0,
              ...(otherUserDocSnap.data() as Partial<UserProfile>),
            };
            userProfileCache.set(otherReq.userId, otherUserProfile);
          }

          // Calculate compatibility score
          const compatibilityScore = calculateCompatibilityScore(currentUserProfile, otherUserProfile);
          const matchedProfileCompletion = calculateProfileCompletion(otherUserProfile);
          const matchedRating = otherUserProfile.rating || 0;
          const recentActivityScore = getRecentActivityScore(otherReq.createdAt);

          foundMatches.push({
            id: `${myReq.id}_${otherReq.id}`,
            requestA: myReq,
            requestB: otherReq,
            status: "pending",
            compatibilityScore,
            matchedUser: otherUserProfile,
            matchedProfileCompletion,
            matchedRating,
            recentActivityScore,
          });
        }
      }

      // Sort suggestions intelligently while keeping compatibility as top priority.
      foundMatches.sort((a, b) => {
        if (b.compatibilityScore !== a.compatibilityScore) {
          return b.compatibilityScore - a.compatibilityScore;
        }
        if (b.matchedProfileCompletion !== a.matchedProfileCompletion) {
          return b.matchedProfileCompletion - a.matchedProfileCompletion;
        }
        if (b.matchedRating !== a.matchedRating) {
          return b.matchedRating - a.matchedRating;
        }
        return b.recentActivityScore - a.recentActivityScore;
      });

      setMatches(foundMatches);
      if (foundMatches.length === 0) {
        toast({ title: "No matches found", description: "Try posting different requests or check back later." });
      } else {
        toast({ title: `Found ${foundMatches.length} suggestion${foundMatches.length === 1 ? "" : "s"}!` });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSearching(false);
  };

  const acceptMatch = async (match: Match) => {
    try {
      await addDoc(collection(db, "matches"), {
        userA: match.requestA.userId,
        userB: match.requestB.userId,
        requestA: match.requestA.id,
        requestB: match.requestB.id,
        skillA: match.requestA.offer_skill,
        skillB: match.requestB.offer_skill,
        status: "accepted",
        createdAt: serverTimestamp(),
      });
      toast({ title: "Match accepted! 🎉", description: "You can now coordinate your skill exchange." });
      setMatches((prev) => prev.filter((m) => m.id !== match.id));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const viewMatchProfile = (displayName: string) => {
    navigate("/discover");
    toast({
      title: "Profile Explorer",
      description: `Browse Discover to view ${displayName}'s profile details.`,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Recommendations */}
      <RecommendedUsers />

      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Matches</h1>
        <Button onClick={findMatches} disabled={searching} className="gap-2">
          <Search className="h-4 w-4" />
          {searching ? "Searching..." : "Find Match"}
        </Button>
      </div>

      {/* My requests */}
      <div>
        <h2 className="font-heading text-lg font-semibold mb-3">My Open Requests</h2>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : myRequests.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground text-sm">
              No requests yet. Create one to start matching!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {myRequests.map((r) => (
              <Card key={r.id}>
                <CardContent className="py-4">
                  <p className="font-medium">{r.title}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">Need: {r.need_skill}</Badge>
                    <Badge>Offer: {r.offer_skill}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Found matches */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-lg font-semibold">Match Suggestions</h2>
          {matches.length > 0 && (
            <Badge variant="secondary">{matches.length} suggestion{matches.length === 1 ? "" : "s"}</Badge>
          )}
        </div>

        {matches.length === 0 ? (
          hasSearched ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground text-sm">
                No compatible suggestions right now. Try different request skills or check back later.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground text-sm">
                Click Find Match to explore compatible suggestions.
              </CardContent>
            </Card>
          )
        ) : (
          <div className="space-y-3">
            {matches.map((m) => (
              <Card key={m.id} className="border-primary/30">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-base font-heading flex items-center gap-2">
                      <Repeat2 className="h-4 w-4 text-primary" />
                      {m.requestB.userName}
                    </CardTitle>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{m.compatibilityScore}%</div>
                      <p className="text-xs text-muted-foreground">Compatible</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={m.compatibilityScore} className="h-2" />

                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="secondary">Rating: {m.matchedRating.toFixed(1)} ⭐</Badge>
                    <Badge variant="outline">Profile: {m.matchedProfileCompletion}%</Badge>
                  </div>

                  {m.matchedUser.availability_preferences && m.matchedUser.availability_preferences.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Availability</p>
                      <div className="flex flex-wrap gap-1">
                        {m.matchedUser.availability_preferences.map((slot) => (
                          <Badge key={`${m.id}_${slot}`} variant="secondary" className="text-xs">
                            {slot}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">You teach</p>
                      <Badge>{m.requestA.offer_skill}</Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">You learn</p>
                      <Badge variant="secondary">{m.requestA.need_skill}</Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">They teach</p>
                      <Badge>{m.requestB.offer_skill}</Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">They need</p>
                      <Badge variant="secondary">{m.requestB.need_skill}</Badge>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => viewMatchProfile(m.requestB.userName)}>
                      View Profile
                    </Button>
                    <Button size="sm" onClick={() => acceptMatch(m)}>
                      Accept Match
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/discover">Explore Suggestions</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
