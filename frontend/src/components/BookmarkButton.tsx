import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSavedItems, SavedItemType } from "@/contexts/SavedItemsContext";
import { useToast } from "@/hooks/use-toast";

interface BookmarkButtonProps {
  itemId: string;
  type: SavedItemType;
  title: string;
  category?: string;
  compatibilityScore?: number;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost" | "secondary";
  showText?: boolean;
}

export default function BookmarkButton({
  itemId,
  type,
  title,
  category,
  compatibilityScore,
  size = "sm",
  variant = "ghost",
  showText = false,
}: BookmarkButtonProps) {
  const { isSaved, saveItem, unsaveItem } = useSavedItems();
  const { toast } = useToast();
  const saved = isSaved(itemId, type);

  const handleBookmarkToggle = async () => {
    try {
      if (saved) {
        await unsaveItem(itemId, type);
        toast({ title: "Removed from saved" });
      } else {
        await saveItem(itemId, type, title, category, compatibilityScore);
        toast({ title: "Added to saved" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to update bookmark.", variant: "destructive" });
    }
  };

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleBookmarkToggle}
      className={`gap-1.5 ${saved ? "text-amber-500" : ""}`}
    >
      <Bookmark
        className="h-4 w-4"
        fill={saved ? "currentColor" : "none"}
      />
      {showText && <span>{saved ? "Saved" : "Save"}</span>}
    </Button>
  );
}
