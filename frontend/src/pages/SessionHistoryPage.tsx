import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { Clock3, ArrowRight, History, MessageSquare } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/LoadingSkeletons";
import { cn } from "@/lib/utils";
import ReviewSubmissionDialog from "@/components/ReviewSubmissionDialog";
import {
  buildSessionHistoryEntry,
  getSessionHistoryDedupKey,
  getSessionHistoryCompletedMillis,
  type MatchHistoryRecord,
  type SessionHistoryEntry,
} from "@/lib/sessionHistory";

interface HistoryUserProfile {
  uid: string;
  displayName?: string;
  rating?: number;
}

const HISTORY_BATCH_SIZE = 10;

function groupByMonth(entries: SessionHistoryEntry[]) {
  const groups = new Map<string, SessionHistoryEntry[]>();

  entries.forEach((entry) => {
    const label = new Date(entry.completedAtMillis || Date.now()).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
    const existing = groups.get(label) || [];
    existing.push(entry);
    groups.set(label, existing);
  });

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

export default function SessionHistoryPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [historyLimit, setHistoryLimit] = useState(HISTORY_BATCH_SIZE);
  const [entries, setEntries] = useState<SessionHistoryEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedReviewEntry, setSelectedReviewEntry] = useState<SessionHistoryEntry | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadHistory = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const [userASnap, userBSnap] = await Promise.all([
          getDocs(query(collection(db, "matches"), where("userA", "==", user.uid), limit(historyLimit))),
          getDocs(query(collection(db, "matches"), where("userB", "==", user.uid), limit(historyLimit))),
        ]);

        const mergedRecords = new Map<string, MatchHistoryRecord>();
        [...userASnap.docs, ...userBSnap.docs].forEach((matchDoc) => {
          const record = { id: matchDoc.id, ...matchDoc.data() } as MatchHistoryRecord;
          if ((record.status || "").toLowerCase() !== "completed") return;

          const dedupKey = getSessionHistoryDedupKey(record);
          if (!mergedRecords.has(dedupKey)) {
            mergedRecords.set(dedupKey, record);
          }
        });

        const orderedRecords = Array.from(mergedRecords.values()).sort(
          (a, b) => getSessionHistoryCompletedMillis(b) - getSessionHistoryCompletedMillis(a),
        );

        const partnerIds = Array.from(
          new Set(
            orderedRecords
              .map((record) => {
                if (record.userA === user.uid) return record.userB;
                if (record.userB === user.uid) return record.userA;
                return null;
              })
              .filter((partnerId): partnerId is string => Boolean(partnerId)),
          ),
        );

        const partnerProfileMap = new Map<string, HistoryUserProfile>();
        await Promise.all(
          partnerIds.map(async (partnerId) => {
            const partnerSnap = await getDoc(doc(db, "users", partnerId));
            if (partnerSnap.exists()) {
              partnerProfileMap.set(partnerId, { uid: partnerId, ...(partnerSnap.data() as HistoryUserProfile) });
            }
          }),
        );

        const nextEntries = orderedRecords.map((record, index) => {
          const partnerId = record.userA === user.uid ? record.userB || "" : record.userA || "";
          const partnerProfile = partnerProfileMap.get(partnerId);
          return buildSessionHistoryEntry(
            record,
            user.uid,
            partnerProfile?.displayName,
            partnerProfile?.rating,
            index + 1,
          );
        }).filter((entry): entry is SessionHistoryEntry => Boolean(entry));

        if (mounted) {
          setEntries(nextEntries);
          setHasMore(userASnap.size >= historyLimit || userBSnap.size >= historyLimit);
        }
      } catch (error) {
        console.error("Error loading session history:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadHistory();

    return () => {
      mounted = false;
    };
  }, [historyLimit, user]);

  const groupedEntries = useMemo(() => groupByMonth(entries), [entries]);

  const latestEntry = entries[0];
  const totalExchanges = entries.length;
  const uniquePartners = new Set(entries.map((entry) => entry.partnerId)).size;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Session History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Read-only timeline of completed skill exchanges and collaboration milestones.
          </p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <History className="h-5 w-5" />
          <span className="text-sm">Completed exchanges only</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-primary/15 bg-gradient-to-br from-primary/5 to-background">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Completed exchanges</p>
            <p className="text-2xl font-bold font-heading">{totalExchanges}</p>
            <p className="text-xs text-muted-foreground">Newest completed exchanges first</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Partners</p>
            <p className="text-2xl font-bold font-heading">{uniquePartners}</p>
            <p className="text-xs text-muted-foreground">Unique exchange collaborators</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Latest milestone</p>
            <p className="text-sm font-semibold truncate">{latestEntry ? latestEntry.partnerName : "No completed exchanges yet"}</p>
            <p className="text-xs text-muted-foreground">
              {latestEntry ? latestEntry.relativeTimeLabel : "Complete your first exchange to build a timeline."}
            </p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <ListSkeleton count={4} />
      ) : entries.length === 0 ? (
        <Card className="border-dashed border-primary/20 bg-primary/5">
          <CardContent className="py-12 text-center space-y-3">
            <Clock3 className="mx-auto h-10 w-10 text-primary/60" />
            <div className="space-y-1">
              <p className="font-medium">No completed exchanges yet</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Your completed matches will appear here as a private, read-only timeline once you finish exchanges.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/matches">Go to Matches</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {groupedEntries.map((group) => (
            <section key={group.label} className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />
                <h2 className="font-heading text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {group.label}
                </h2>
              </div>

              <div className="relative pl-4 sm:pl-6">
                <div className="absolute left-2 top-1 bottom-1 w-px bg-border sm:left-3" aria-hidden="true" />
                <div className="space-y-4">
                  {group.items.map((entry) => (
                    <Card
                      key={entry.key}
                      className={cn(
                        "relative overflow-hidden border-primary/15 bg-gradient-to-br from-primary/5 via-background to-accent/5 shadow-sm",
                      )}
                    >
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-semibold text-primary">
                            {entry.milestoneIndex}
                          </div>

                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-heading text-base font-semibold truncate">{entry.partnerName}</h3>
                                  <Badge variant="secondary" className="rounded-full">
                                    Completed
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {entry.completedAtLabel} · {entry.relativeTimeLabel}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <Badge variant="outline" className="rounded-full">
                                  {entry.matchStatus}
                                </Badge>
                                {entry.ratingSummary !== undefined && (
                                  <Badge variant="outline" className="rounded-full">
                                    Partner rating {entry.ratingSummary.toFixed(1)}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="rounded-xl border bg-background/70 p-3">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Offered skill</p>
                                <p className="font-medium">{entry.offeredSkill || "Not recorded"}</p>
                              </div>
                              <div className="rounded-xl border bg-background/70 p-3">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Learned skill</p>
                                <p className="font-medium">{entry.learnedSkill || "Not recorded"}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1 rounded-full border bg-background/80 px-2.5 py-1">
                                <Clock3 className="h-3.5 w-3.5" />
                                {entry.relativeTimeLabel}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full border bg-background/80 px-2.5 py-1">
                                Timeline card #{entry.milestoneIndex}
                              </span>
                            </div>

                            {/* Review button */}
                            <div className="pt-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedReviewEntry(entry);
                                  setReviewDialogOpen(true);
                                }}
                                className="w-full sm:w-auto"
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Leave Review
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </section>
          ))}

          {hasMore && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setHistoryLimit((current) => current + HISTORY_BATCH_SIZE)}
                disabled={loading}
              >
                <ArrowRight className="h-4 w-4" />
                Load more history
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Review submission dialog */}
      {selectedReviewEntry && user && profile && (
        <ReviewSubmissionDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          partnerId={selectedReviewEntry.partnerId}
          partnerName={selectedReviewEntry.partnerName}
          matchId={selectedReviewEntry.matchId}
          currentUserId={user.uid}
          currentUserName={profile.displayName || "User"}
          offeredSkill={selectedReviewEntry.offeredSkill}
          learnedSkill={selectedReviewEntry.learnedSkill}
          onSubmitSuccess={() => {
            // Refresh entries to update review status if needed
            setReviewDialogOpen(false);
            setSelectedReviewEntry(null);
          }}
        />
      )}
    </div>
  );
}
