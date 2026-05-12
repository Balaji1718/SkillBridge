import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { normalizeSkill, skillMatches, partialMatch, calculateCompatibilityScore } from "@/lib/utils";
import { Search, X } from "lucide-react";
import RecommendedUsers from "@/components/RecommendedUsers";
import SkillAutocomplete from "@/components/SkillAutocomplete";

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  bio: string;
  skills_offered?: string[];
  skills_offered_with_levels?: Array<{ skill: string; level: string }>;
  skills_needed?: string[];
  skills_needed_with_levels?: Array<{ skill: string; level: string }>;
  availability_preferences?: string[];
  rating: number;
  exchanges_completed: number;
}

const availabilityOptions = [
  "Weekdays",
  "Weekends",
  "Evenings",
  "Mornings",
  "Online Only",
  "Flexible Schedule",
];

export default function DiscoverPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [selectedAvailability, setSelectedAvailability] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, skillFilter, minRating, selectedAvailability, allUsers]);

  const loadUsers = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      const users = snap.docs
        .map((doc) => {
          const data = doc.data() as UserProfile;
          return {
            uid: doc.id,
            ...data,
            rating: data.rating || 0,
            exchanges_completed: data.exchanges_completed || 0,
          };
        })
        .filter((u) => u.uid !== user?.uid); // exclude current user
      setAllUsers(users);
      setFilteredUsers(users);
    } catch (err) {
      console.error(err);
      toast({ title: "Error loading users", variant: "destructive" });
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let results = allUsers;

    // Search by name or bio
    if (searchQuery) {
      results = results.filter((u) =>
        partialMatch(u.displayName, searchQuery) || partialMatch(u.bio, searchQuery)
      );
    }

    // Filter by offered skill
    if (skillFilter) {
      results = results.filter((u) => {
        const offeredSkills = [
          ...(u.skills_offered || []),
          ...(u.skills_offered_with_levels?.map((s) => s.skill) || []),
        ];
        return offeredSkills.some((s) => skillMatches(s, skillFilter));
      });
    }

    // Filter by minimum rating
    if (minRating > 0) {
      results = results.filter((u) => u.rating >= minRating);
    }

    // Filter by availability
    if (selectedAvailability.length > 0) {
      results = results.filter((u) => {
        const userAvailability = u.availability_preferences || [];
        return selectedAvailability.some((a) => userAvailability.includes(a));
      });
    }

    setFilteredUsers(results);
  };

  const toggleAvailabilityFilter = (option: string) => {
    setSelectedAvailability((prev) =>
      prev.includes(option) ? prev.filter((a) => a !== option) : [...prev, option]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSkillFilter("");
    setMinRating(0);
    setSelectedAvailability([]);
  };

  const hasActiveFilters = searchQuery || skillFilter || minRating > 0 || selectedAvailability.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <RecommendedUsers limit={4} />

      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Discover Users</h1>
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Search className="h-4 w-4 mr-2" />
          {showFilters ? "Hide" : "Show"} Filters
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              Filters
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Skill Filter */}
            <div>
              <Label className="text-sm font-medium">Skill They Offer</Label>
              <SkillAutocomplete
                placeholder="e.g. React, JavaScript, Spanish..."
                value={skillFilter}
                onChange={setSkillFilter}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Partial matches supported (e.g., "React" finds "React.js")
              </p>
            </div>

            {/* Rating Filter */}
            <div>
              <Label className="text-sm font-medium">Minimum Rating</Label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={minRating}
                  onChange={(e) => setMinRating(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-semibold w-12">{minRating.toFixed(1)}</span>
              </div>
            </div>

            {/* Availability Filter */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Availability</Label>
              <div className="flex flex-wrap gap-2">
                {availabilityOptions.map((option) => {
                  const selected = selectedAvailability.includes(option);
                  return (
                    <Button
                      key={option}
                      type="button"
                      size="sm"
                      variant={selected ? "default" : "outline"}
                      onClick={() => toggleAvailabilityFilter(option)}
                      className="rounded-full"
                    >
                      {option}
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          {loading ? "Loading..." : `${filteredUsers.length} user${filteredUsers.length !== 1 ? "s" : ""} found`}
        </p>

        {loading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Loading users...
            </CardContent>
          </Card>
        ) : filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {hasActiveFilters ? "No users match your filters. Try adjusting them." : "No users found."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredUsers.map((u) => {
              const offeredSkills = [
                ...(u.skills_offered || []),
                ...(u.skills_offered_with_levels?.map((s) => s.skill) || []),
              ].slice(0, 3);
              const neededSkills = [
                ...(u.skills_needed || []),
                ...(u.skills_needed_with_levels?.map((s) => s.skill) || []),
              ].slice(0, 3);

              // Calculate compatibility score
              const compatibilityScore = profile ? calculateCompatibilityScore(profile, u) : 0;

              return (
                <Card key={u.uid} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{u.displayName}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {u.exchanges_completed} exchange{u.exchanges_completed !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="secondary">{u.rating.toFixed(1)} ⭐</Badge>
                        {profile && (
                          <div className="text-right">
                            <div className="text-sm font-bold text-primary">{compatibilityScore}%</div>
                            <p className="text-xs text-muted-foreground">Match</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {profile && compatibilityScore > 0 && (
                      <Progress value={compatibilityScore} className="h-2" />
                    )}
                    {u.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{u.bio}</p>
                    )}

                    {offeredSkills.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">
                          Can Teach
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {offeredSkills.map((s, index) => (
                            <Badge key={`${u.uid}-offered-${index}-${normalizeSkill(s) || s}`} variant="outline" className="text-xs">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {neededSkills.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">
                          Wants to Learn
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {neededSkills.map((s, index) => (
                            <Badge key={`${u.uid}-needed-${index}-${normalizeSkill(s) || s}`} variant="secondary" className="text-xs">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {u.availability_preferences && u.availability_preferences.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">
                          Available
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {u.availability_preferences.map((a, index) => (
                            <Badge key={`${u.uid}-availability-${index}-${a}`} className="text-xs" variant="secondary">
                              {a}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button size="sm" className="w-full mt-2">
                      View Profile
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
