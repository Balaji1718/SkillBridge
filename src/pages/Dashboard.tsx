import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { PlusCircle, Repeat2, Star, BookOpen } from "lucide-react";

export default function Dashboard() {
  const { profile } = useAuth();

  const stats = [
    { label: "Skills Offered", value: profile?.skills_offered?.length || 0, icon: BookOpen, color: "text-primary" },
    { label: "Skills Needed", value: profile?.skills_needed?.length || 0, icon: Repeat2, color: "text-accent" },
    { label: "Exchanges", value: profile?.exchanges_completed || 0, icon: Star, color: "text-success" },
    { label: "Rating", value: profile?.rating ? profile.rating.toFixed(1) : "N/A", icon: Star, color: "text-accent" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold">Welcome, {profile?.displayName || "Student"} 👋</h1>
        <p className="text-muted-foreground mt-1">Ready to exchange skills today?</p>
      </div>

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
    </div>
  );
}
