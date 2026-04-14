import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Repeat2, Search } from "lucide-react";

interface SkillRequest {
  id: string;
  userId: string;
  userName: string;
  title: string;
  description: string;
  need_skill: string;
  offer_skill: string;
  status: string;
}

interface Match {
  id: string;
  requestA: SkillRequest;
  requestB: SkillRequest;
  status: string;
}

export default function MatchesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [myRequests, setMyRequests] = useState<SkillRequest[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

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
    const foundMatches: Match[] = [];

    try {
      for (const myReq of myRequests) {
        if (myReq.status !== "open") continue;
        // Find requests where someone offers what I need AND needs what I offer
        const q = query(
          collection(db, "requests"),
          where("offer_skill", "==", myReq.need_skill),
          where("status", "==", "open")
        );
        const snap = await getDocs(q);
        for (const doc of snap.docs) {
          const otherReq = { id: doc.id, ...doc.data() } as SkillRequest;
          if (otherReq.userId === user.uid) continue;
          // Check reciprocal: other needs what I offer
          if (otherReq.need_skill === myReq.offer_skill) {
            foundMatches.push({
              id: `${myReq.id}_${otherReq.id}`,
              requestA: myReq,
              requestB: otherReq,
              status: "pending",
            });
          }
        }
      }
      setMatches(foundMatches);
      if (foundMatches.length === 0) {
        toast({ title: "No matches found", description: "Try posting different requests or check back later." });
      } else {
        toast({ title: `Found ${foundMatches.length} match(es)!` });
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

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
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
      {matches.length > 0 && (
        <div>
          <h2 className="font-heading text-lg font-semibold mb-3">Found Matches</h2>
          <div className="space-y-3">
            {matches.map((m) => (
              <Card key={m.id} className="border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-heading flex items-center gap-2">
                    <Repeat2 className="h-4 w-4 text-primary" />
                    Skill Exchange Match
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">You teach:</p>
                      <Badge>{m.requestA.offer_skill}</Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">You learn:</p>
                      <Badge variant="secondary">{m.requestA.need_skill}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Match with <span className="font-medium text-foreground">{m.requestB.userName}</span>
                  </p>
                  <Button size="sm" onClick={() => acceptMatch(m)}>Accept Match</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
