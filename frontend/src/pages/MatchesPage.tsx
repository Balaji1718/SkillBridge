import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, writeBatch, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { calculateCompatibilityScore, calculateProfileCompletion, normalizeSkill, partialMatch } from "@/lib/utils";
import { Repeat2, Search, X, Mail, MessageSquare } from "lucide-react";
import RecommendedUsers from "@/components/RecommendedUsers";
import ReportModal from "@/components/ReportModal";
import BookmarkButton from "@/components/BookmarkButton";
import SuggestionModal from "@/components/SuggestionModal";
import ChatDialog from "@/components/ChatDialog";
import { ListSkeleton, MatchCardSkeleton } from "@/components/LoadingSkeletons";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { useDebounce } from "@/hooks/useDebounce";
import RequestStatusBadge from "@/components/RequestStatusBadge";
import { getRequestLifecycleStatus, isRequestActive, shouldAutoArchive } from "@/lib/requestStatus";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SKILL_CATEGORY_OPTIONS, getSkillCategory, categoryBadgeClasses } from "@/lib/skillCategories";

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
  expiresAt?: { seconds?: number; nanoseconds?: number };
  archivedAt?: { seconds?: number; nanoseconds?: number };
  completedAt?: { seconds?: number; nanoseconds?: number };
  archiveReason?: string;
}

interface UserProfile {
  uid: string;
  displayName: string;
  email?: string;
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
  createdAt?: { seconds?: number; nanoseconds?: number };
  completedAt?: { seconds?: number; nanoseconds?: number };
  userAName?: string;
  userBName?: string;
}

export default function MatchesPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [myRequests, setMyRequests] = useState<SkillRequest[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeMatches, setActiveMatches] = useState<Match[]>([]);
  const [activeMatchesLoading, setActiveMatchesLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [requestFilter, setRequestFilter] = useState<"all" | "active" | "archived" | "completed">("all");
  const [requestCategoryFilter, setRequestCategoryFilter] = useState<string>("all");
  const [requestSearchQuery, setRequestSearchQuery] = useState<string>("");
  const debouncedRequestSearchQuery = useDebounce(requestSearchQuery, 300);
  const delayedLoading = useDelayedLoading(loading);
  const delayedSearching = useDelayedLoading(searching);

  useEffect(() => {
    loadMyRequests();
    loadActiveMatches();
  }, [user]);

  const loadMyRequests = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, "requests"), where("userId", "==", user.uid));
      const snap = await getDocs(q);

      const requests = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SkillRequest));
      const expiredRequestIds = requests.filter((request) => shouldAutoArchive(request)).map((request) => request.id);

      if (expiredRequestIds.length > 0) {
        const batch = writeBatch(db);
        expiredRequestIds.forEach((requestId) => {
          batch.update(doc(db, "requests", requestId), {
            status: "archived",
            archivedAt: serverTimestamp(),
            archiveReason: "expired",
          });
        });
        await batch.commit();
      }

      setMyRequests(
        requests.map((request) =>
          expiredRequestIds.includes(request.id)
            ? { ...request, status: "archived", archiveReason: "expired" }
            : request,
        ),
      );
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const loadActiveMatches = async () => {
    if (!user) return;
    setActiveMatchesLoading(true);
    try {
      const [userASnap, userBSnap] = await Promise.all([
        getDocs(query(collection(db, "matches"), where("userA", "==", user.uid), where("status", "==", "accepted"))),
        getDocs(query(collection(db, "matches"), where("userB", "==", user.uid), where("status", "==", "accepted"))),
      ]);

      const mergedRecords = new Map<string, any>();
      [...userASnap.docs, ...userBSnap.docs].forEach((matchDoc) => {
        mergedRecords.set(matchDoc.id, { id: matchDoc.id, ...matchDoc.data() });
      });

      const orderedRecords = Array.from(mergedRecords.values());

      const partnerIds = Array.from(
        new Set(
          orderedRecords
            .map((record) => (record.userA === user.uid ? record.userB : record.userA))
            .filter(Boolean)
        )
      ) as string[];

      const partnerProfileMap = new Map<string, any>();
      await Promise.all(
        partnerIds.map(async (partnerId) => {
          const partnerSnap = await getDoc(doc(db, "users", partnerId));
          if (partnerSnap.exists()) {
            partnerProfileMap.set(partnerId, partnerSnap.data());
          }
        })
      );

      const matchesWithPartners = orderedRecords.map((record) => {
        const partnerId = record.userA === user.uid ? record.userB : record.userA;
        const partnerProfile = partnerProfileMap.get(partnerId);
        return {
          ...record,
          matchedUser: {
            uid: partnerId,
            displayName: partnerId === record.userA ? record.userAName : record.userBName,
            email: partnerProfile?.email || "",
            bio: partnerProfile?.bio || "",
            skills_offered: partnerProfile?.skills_offered || [],
            skills_needed: partnerProfile?.skills_needed || [],
            rating: partnerProfile?.rating || 0,
            exchanges_completed: partnerProfile?.exchanges_completed || 0,
            availability_preferences: partnerProfile?.availability_preferences || [],
          },
        };
      });

      setActiveMatches(matchesWithPartners as unknown as Match[]);
    } catch (err) {
      console.error("Error loading active matches:", err);
    } finally {
      setActiveMatchesLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string, nextStatus: "archived" | "completed") => {
    try {
      await updateDoc(doc(db, "requests", requestId), {
        status: nextStatus,
        ...(nextStatus === "completed"
          ? { completedAt: serverTimestamp() }
          : { archivedAt: serverTimestamp(), archiveReason: "manual" }),
      });

      if (nextStatus === "completed" && user) {
        const matchDocs = new Map<string, { id: string }>();
        const [userAMatches, userBMatches] = await Promise.all([
          getDocs(query(collection(db, "matches"), where("requestA", "==", requestId), where("userA", "==", user.uid))),
          getDocs(query(collection(db, "matches"), where("requestB", "==", requestId), where("userB", "==", user.uid))),
        ]);

        [...userAMatches.docs, ...userBMatches.docs].forEach((matchDoc) => {
          matchDocs.set(matchDoc.id, { id: matchDoc.id });
        });

        if (matchDocs.size > 0) {
          const batch = writeBatch(db);
          matchDocs.forEach((matchDoc) => {
            batch.update(doc(db, "matches", matchDoc.id), {
              status: "completed",
              completedAt: serverTimestamp(),
              completedBy: user.uid,
            });
          });
          await batch.commit();
        }
      }

      setMyRequests((prev) =>
        prev.map((request) =>
          request.id === requestId
            ? {
                ...request,
                status: nextStatus,
                ...(nextStatus === "completed" ? { completedAt: { seconds: Math.floor(Date.now() / 1000) } } : { archivedAt: { seconds: Math.floor(Date.now() / 1000) }, archiveReason: "manual" }),
              }
            : request,
        ),
      );
      toast({
        title: nextStatus === "completed" ? "Marked completed" : "Archived request",
        description: "The request is preserved and moved out of active matching.",
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const activeRequests = myRequests.filter((request) => isRequestActive(request));
  const archivedRequests = myRequests.filter((request) => getRequestLifecycleStatus(request) === "archived");
  const completedRequests = myRequests.filter((request) => getRequestLifecycleStatus(request) === "completed");

  const visibleActiveRequests =
    requestFilter === "all" || requestFilter === "active" ? activeRequests : [];
  const visibleArchivedRequests =
    requestFilter === "all" || requestFilter === "archived" ? archivedRequests : [];
  const visibleCompletedRequests =
    requestFilter === "all" || requestFilter === "completed" ? completedRequests : [];

  const filterRequestByCategory = (request: SkillRequest) => {
    if (requestCategoryFilter === "all") return true;
    const requestCategories = [request.need_skill, request.offer_skill]
      .map((skill) => getSkillCategory(skill))
      .filter(Boolean);
    return requestCategories.includes(requestCategoryFilter as any);
  };

  const filterRequestBySearch = (request: SkillRequest) => {
    if (!debouncedRequestSearchQuery) return true;
    const query = debouncedRequestSearchQuery.toLowerCase();
    return (
      partialMatch(request.title, debouncedRequestSearchQuery) ||
      partialMatch(request.description, debouncedRequestSearchQuery) ||
      partialMatch(request.need_skill, debouncedRequestSearchQuery) ||
      partialMatch(request.offer_skill, debouncedRequestSearchQuery)
    );
  };

  const hasActiveRequestFilters = requestFilter !== "all" || requestCategoryFilter !== "all" || requestSearchQuery !== "";

  const filteredVisibleActiveRequests = visibleActiveRequests.filter(filterRequestByCategory).filter(filterRequestBySearch);
  const filteredVisibleArchivedRequests = visibleArchivedRequests.filter(filterRequestByCategory).filter(filterRequestBySearch);
  const filteredVisibleCompletedRequests = visibleCompletedRequests.filter(filterRequestByCategory).filter(filterRequestBySearch);

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
        if (!isRequestActive(myReq)) continue;
        // Find requests where someone offers what I need AND needs what I offer.
        const matchingRequests = allOpenRequests.filter((otherReq) => {
          if (otherReq.userId === user.uid) return false;
          if (!isRequestActive(otherReq)) return false;
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
        userAName: match.requestA.userName,
        userBName: match.requestB.userName,
        requestA: match.requestA.id,
        requestB: match.requestB.id,
        skillA: match.requestA.offer_skill,
        skillB: match.requestB.offer_skill,
        status: "accepted",
        createdAt: serverTimestamp(),
      });
      toast({ title: "Match accepted! 🎉", description: "You can now coordinate your skill exchange." });
      setMatches((prev) => prev.filter((m) => m.id !== match.id));
      loadActiveMatches();
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
        <Button onClick={findMatches} loading={searching} className="gap-2">
          <Search className="h-4 w-4" />
          Find Match
        </Button>
      </div>

      {/* My requests */}
      <div>
        <h2 className="font-heading text-lg font-semibold mb-3">My Requests</h2>

        {/* Search */}
        <Card className="mb-3">
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search requests by skill or title..."
                value={requestSearchQuery}
                onChange={(e) => setRequestSearchQuery(e.target.value)}
                className="flex-1"
                aria-label="Search requests"
              />
              {requestSearchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRequestSearchQuery("")}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex flex-wrap gap-2">
            {(["all", "active", "archived", "completed"] as const).map((filter) => (
              <Button
                key={filter}
                type="button"
                size="sm"
                variant={requestFilter === filter ? "default" : "outline"}
                onClick={() => setRequestFilter(filter)}
                className="rounded-full"
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Button>
            ))}
          </div>
          <Select value={requestCategoryFilter} onValueChange={setRequestCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {SKILL_CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {delayedLoading ? (
          <ListSkeleton count={2} />
        ) : myRequests.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground text-sm">
              No requests yet. Create one to start matching!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {filteredVisibleActiveRequests.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wide">Active Requests</h3>
                <div className="space-y-3">
                  {filteredVisibleActiveRequests.map((r) => (
                    <Card key={r.id} className="border-emerald-500/20">
                      <CardContent className="py-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium truncate">{r.title}</p>
                              <RequestStatusBadge request={r} />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary">Need: {r.need_skill}</Badge>
                              <Badge>Offer: {r.offer_skill}</Badge>
                              <Badge variant="outline" className={`rounded-full text-[10px] uppercase tracking-wide ${categoryBadgeClasses(getSkillCategory(r.offer_skill || r.need_skill))}`}>
                                {getSkillCategory(r.offer_skill || r.need_skill)}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => updateRequestStatus(r.id, "archived")}>
                                Archive
                              </Button>
                              <Button size="sm" onClick={() => updateRequestStatus(r.id, "completed")}>
                                Complete
                              </Button>
                              <ReportModal targetType="request" targetId={r.id} />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {(filteredVisibleArchivedRequests.length > 0 || filteredVisibleCompletedRequests.length > 0) && (
              <div className="space-y-3">
                <h3 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wide">Archived Requests</h3>
                <div className="space-y-3">
                  {filteredVisibleArchivedRequests.map((r) => (
                    <Card key={r.id} className="border-amber-500/20 bg-amber-500/5">
                      <CardContent className="py-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium truncate">{r.title}</p>
                              <RequestStatusBadge request={r} />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary">Need: {r.need_skill}</Badge>
                              <Badge>Offer: {r.offer_skill}</Badge>
                              <Badge variant="outline" className={`rounded-full text-[10px] uppercase tracking-wide ${categoryBadgeClasses(getSkillCategory(r.offer_skill || r.need_skill))}`}>
                                {getSkillCategory(r.offer_skill || r.need_skill)}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            <p>Archived</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {filteredVisibleCompletedRequests.map((r) => (
                    <Card key={r.id} className="border-primary/20 bg-primary/5">
                      <CardContent className="py-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium truncate">{r.title}</p>
                              <RequestStatusBadge request={r} />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary">Need: {r.need_skill}</Badge>
                              <Badge>Offer: {r.offer_skill}</Badge>
                              <Badge variant="outline" className={`rounded-full text-[10px] uppercase tracking-wide ${categoryBadgeClasses(getSkillCategory(r.offer_skill || r.need_skill))}`}>
                                {getSkillCategory(r.offer_skill || r.need_skill)}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            <p>Completed</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {filteredVisibleActiveRequests.length === 0 && filteredVisibleArchivedRequests.length === 0 && filteredVisibleCompletedRequests.length === 0 && (
              <Card>
                <CardContent className="py-6 text-center text-muted-foreground text-sm">
                  No requests match this filter.
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Active Collaborations */}
      <div>
        <h2 className="font-heading text-lg font-semibold mb-3">Active Collaborations</h2>
        {activeMatchesLoading ? (
          <ListSkeleton count={1} />
        ) : activeMatches.length === 0 ? (
          <Card className="border-dashed border-primary/20 bg-primary/5">
            <CardContent className="py-6 text-center text-muted-foreground text-sm">
              No active collaborations yet. Find a match and click "Accept Match" to start chatting and sharing skills!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeMatches.map((m) => {
              const partner = m.matchedUser;
              const offeredSkill = m.requestA.userId === user?.uid ? m.requestA.offer_skill : m.requestB.offer_skill;
              const neededSkill = m.requestA.userId === user?.uid ? m.requestA.need_skill : m.requestB.need_skill;

              return (
                <Card key={m.id} className="border-emerald-500/20 bg-emerald-500/5">
                  <CardContent className="py-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-base">{partner.displayName}</p>
                          <Badge variant="secondary">{partner.rating.toFixed(1)} ⭐</Badge>
                        </div>
                        {partner.email && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {partner.email}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 pt-0.5">
                          <Badge variant="outline">You teach: {offeredSkill}</Badge>
                          <Badge variant="outline">You learn: {neededSkill}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0 self-end sm:self-start">
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => {
                            setSelectedMatch(m);
                            setChatOpen(true);
                          }}
                        >
                          <MessageSquare className="h-4 w-4" />
                          Chat
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
          delayedSearching ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <MatchCardSkeleton key={i} />
              ))}
            </div>
          ) : hasSearched ? (
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
                    <SuggestionModal
                      type="collaboration"
                      userName={m.requestB.userName}
                      mySkill={m.requestA.offer_skill}
                      theirSkill={m.requestB.offer_skill}
                      tone="professional"
                    />
                    <BookmarkButton
                      itemId={m.id}
                      type="match"
                      title={m.requestB.userName}
                      category={`${m.requestA.offer_skill} ↔️ ${m.requestB.offer_skill}`}
                      compatibilityScore={m.compatibilityScore}
                      size="sm"
                    />
                    <ReportModal targetType="user" targetId={m.matchedUser?.uid || m.requestB.userId} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {selectedMatch && user && profile && (
        <ChatDialog
          open={chatOpen}
          onOpenChange={setChatOpen}
          matchId={selectedMatch.id}
          partnerName={selectedMatch.matchedUser.displayName}
          partnerEmail={selectedMatch.matchedUser.email}
          currentUserId={user.uid}
          currentUserName={profile.displayName || "User"}
        />
      )}
    </div>
  );
}
