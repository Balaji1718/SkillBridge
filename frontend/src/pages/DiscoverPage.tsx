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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { normalizeSkill, skillMatches, partialMatch, calculateCompatibilityScore } from "@/lib/utils";
import { Search, X, Filter } from "lucide-react";
import RecommendedUsers from "@/components/RecommendedUsers";
import SkillAutocomplete from "@/components/SkillAutocomplete";
import BookmarkButton from "@/components/BookmarkButton";
import { UserCardSkeleton } from "@/components/LoadingSkeletons";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { useDebounce } from "@/hooks/useDebounce";
import { SKILL_CATEGORY_OPTIONS, getSkillCategory, categoryBadgeClasses } from "@/lib/skillCategories";
import { isProfilePublic } from "@/lib/profileVisibility";

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
  const delayedLoading = useDelayedLoading(loading);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [minRating, setMinRating] = useState(0);
  const [selectedAvailability, setSelectedAvailability] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search query to avoid excessive filtering
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [debouncedSearchQuery, skillFilter, categoryFilter, minRating, selectedAvailability, allUsers]);

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
        .filter((u) => u.uid !== user?.uid) // exclude current user
        .filter((u) => isProfilePublic(u)); // exclude private profiles
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

    // Search by name or bio (using debounced query)
    if (debouncedSearchQuery) {
      results = results.filter((u) =>
        partialMatch(u.displayName, debouncedSearchQuery) || partialMatch(u.bio, debouncedSearchQuery)
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

    if (categoryFilter !== "all") {
      results = results.filter((u) => {
        const allSkills = [
          ...(u.skills_offered || []),
          ...(u.skills_offered_with_levels?.map((s) => s.skill) || []),
          ...(u.skills_needed || []),
          ...(u.skills_needed_with_levels?.map((s) => s.skill) || []),
        ];
        return allSkills.some((skill) => getSkillCategory(skill) === categoryFilter);
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
    setCategoryFilter("all");
    setMinRating(0);
    setSelectedAvailability([]);
  };

  const hasActiveFilters = searchQuery || skillFilter || categoryFilter !== "all" || minRating > 0 || selectedAvailability.length > 0;

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
          <Filter className="h-4 w-4 mr-2" />
          {showFilters ? "Hide" : "Show"} Filters
          {hasActiveFilters && (
            <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {[skillFilter ? 1 : 0, categoryFilter !== "all" ? 1 : 0, minRating > 0 ? 1 : 0, selectedAvailability.length > 0 ? 1 : 0].filter(Boolean).length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search by name, bio, or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
              aria-label="Search users"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Filter Chips */}
      {hasActiveFilters && (
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Active Filters:</p>
              <div className="flex flex-wrap gap-2">
                {skillFilter && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80"
                    onClick={() => setSkillFilter("")}
                  >
                    Skill: {skillFilter}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                )}
                {categoryFilter !== "all" && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80"
                    onClick={() => setCategoryFilter("all")}
                  >
                    Category: {SKILL_CATEGORY_OPTIONS.find(opt => opt.value === categoryFilter)?.label}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                )}
                {minRating > 0 && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80"
                    onClick={() => setMinRating(0)}
                  >
                    Rating: {minRating.toFixed(1)}+ ⭐
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                )}
                {selectedAvailability.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80"
                    onClick={() => setSelectedAvailability([])}
                  >
                    {selectedAvailability.length} Availability
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

            <div>
              <Label className="text-sm font-medium">Skill Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

        {delayedLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <UserCardSkeleton key={i} />
            ))}
          </div>
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
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Array.from(new Set(offeredSkills.map((skill) => getSkillCategory(skill)))).slice(0, 3).map((category) => (
                            <Badge key={`${u.uid}-offered-cat-${category}`} variant="outline" className={`rounded-full text-[10px] uppercase tracking-wide ${categoryBadgeClasses(category)}`}>
                              {category}
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
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Array.from(new Set(neededSkills.map((skill) => getSkillCategory(skill)))).slice(0, 3).map((category) => (
                            <Badge key={`${u.uid}-needed-cat-${category}`} variant="outline" className={`rounded-full text-[10px] uppercase tracking-wide ${categoryBadgeClasses(category)}`}>
                              {category}
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

                    <div className="flex gap-2 mt-2">
                      <Button size="sm" className="flex-1">
                        View Profile
                      </Button>
                      <BookmarkButton
                        itemId={u.uid}
                        type="profile"
                        title={u.displayName}
                        category={offeredSkills.length > 0 ? offeredSkills[0] : undefined}
                        compatibilityScore={profile ? calculateCompatibilityScore(profile, u) : undefined}
                        size="sm"
                      />
                    </div>
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
