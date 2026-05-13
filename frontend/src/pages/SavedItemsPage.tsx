import { useSavedItems } from "@/contexts/SavedItemsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bookmark, User, FileText, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ListSkeleton } from "@/components/LoadingSkeletons";

export default function SavedItemsPage() {
  const { savedItems, loading, unsaveItem } = useSavedItems();
  const { toast } = useToast();

  const typeConfig = {
    profile: {
      icon: User,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      label: "Profile",
    },
    request: {
      icon: FileText,
      color: "text-green-600",
      bgColor: "bg-green-100",
      label: "Request",
    },
    match: {
      icon: Zap,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      label: "Match",
    },
  };

  const handleUnsave = async (itemId: string, type: "profile" | "request" | "match", title: string) => {
    try {
      await unsaveItem(itemId, type);
      toast({ title: "Removed from saved", description: `${title} has been removed.` });
    } catch (err) {
      toast({ title: "Error", description: "Failed to remove item.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <h1 className="font-heading text-2xl font-bold">Saved Items</h1>
        <ListSkeleton count={4} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Saved Items</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {savedItems.length} item{savedItems.length !== 1 ? "s" : ""} saved
          </p>
        </div>
        <Bookmark className="h-6 w-6 text-muted-foreground" />
      </div>

      {savedItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground font-medium">No saved items yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Bookmark profiles, requests, and matches to save them for later.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {savedItems.map((item) => {
            const config = typeConfig[item.type];
            const Icon = config.icon;

            return (
              <Card key={`${item.itemId}-${item.type}`} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`${config.bgColor} rounded-lg p-2.5 mt-0.5 flex-shrink-0`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {config.label}
                          </Badge>
                        </div>

                        {item.category && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">{item.category}</p>
                        )}

                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                          </span>
                          {item.compatibilityScore !== undefined && item.compatibilityScore !== null && (
                            <Badge variant="outline" className="text-xs">
                              {item.compatibilityScore}% Match
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnsave(item.itemId, item.type, item.title)}
                      className="text-destructive hover:text-destructive flex-shrink-0"
                    >
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
