import { useEffect, useState } from "react";
import { Star, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Review } from "@/lib/reviews";

interface ReviewSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
  partnerName: string;
  matchId: string;
  currentUserId: string;
  currentUserName: string;
  offeredSkill?: string;
  learnedSkill?: string;
  onSubmitSuccess?: () => void;
}

export default function ReviewSubmissionDialog({
  open,
  onOpenChange,
  partnerId,
  partnerName,
  matchId,
  currentUserId,
  currentUserName,
  offeredSkill,
  learnedSkill,
  onSubmitSuccess,
}: ReviewSubmissionDialogProps) {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existingReview, setExistingReview] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);

  useEffect(() => {
    if (!open) {
      setRating(0);
      setHoveredRating(0);
      setComment("");
      setExistingReview(false);
      setSubmitting(false);
      setCheckingExisting(false);
    }
  }, [open]);

  const handleOpenChange = async (newOpen: boolean) => {
    if (newOpen) {
      // Check if review already exists
      setCheckingExisting(true);
      setExistingReview(false);
      try {
        const reviewsQuery = query(
          collection(db, "reviews"),
          where("reviewer_uid", "==", currentUserId),
          where("reviewed_uid", "==", partnerId),
          where("match_id", "==", matchId)
        );
        const snapshot = await getDocs(reviewsQuery);
        setExistingReview(!snapshot.empty);
      } catch (error) {
        console.error("Error checking for existing review:", error);
      } finally {
        setCheckingExisting(false);
      }
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a star rating",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Check again for duplicate before submitting
      const reviewsQuery = query(
        collection(db, "reviews"),
        where("reviewer_uid", "==", currentUserId),
        where("reviewed_uid", "==", partnerId),
        where("match_id", "==", matchId)
      );
      const snapshot = await getDocs(reviewsQuery);

      if (!snapshot.empty) {
        toast({
          title: "Review already submitted",
          description: "You've already reviewed this exchange with this partner",
          variant: "destructive",
        });
        return;
      }

      const reviewData: Omit<Review, "id"> = {
        reviewer_uid: currentUserId,
        reviewer_name: currentUserName,
        reviewed_uid: partnerId,
        match_id: matchId,
        rating,
        comment: comment.trim() || undefined,
        created_at: Date.now(),
      };

      await addDoc(collection(db, "reviews"), reviewData);

      toast({
        title: "Review submitted!",
        description: "Your feedback helps build trust in SkillBridge.",
      });

      // Reset form
      setRating(0);
      setComment("");
      onOpenChange(false);
      onSubmitSuccess?.();
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast({
        title: "Error submitting review",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review {partnerName}</DialogTitle>
          <DialogDescription>
            Share your feedback about this exchange
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {existingReview && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You've already reviewed this exchange with {partnerName}.
              </AlertDescription>
            </Alert>
          )}

          {/* Skills exchanged */}
          {(offeredSkill || learnedSkill) && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium mb-1">Exchange Details</p>
              <div className="space-y-1 text-muted-foreground">
                {offeredSkill && <p>You taught: {offeredSkill}</p>}
                {learnedSkill && <p>You learned: {learnedSkill}</p>}
              </div>
            </div>
          )}

          {/* Star rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Rating</label>
            <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Star rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onFocus={() => setHoveredRating(star)}
                  onBlur={() => setHoveredRating(0)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                      event.preventDefault();
                      setRating((current) => Math.min(5, Math.max(current || star, 1) + 1));
                    }
                    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
                      event.preventDefault();
                      setRating((current) => Math.max(1, Math.min(current || star, 5) - 1));
                    }
                    if (event.key === "Home") {
                      event.preventDefault();
                      setRating(1);
                    }
                    if (event.key === "End") {
                      event.preventDefault();
                      setRating(5);
                    }
                  }}
                  disabled={existingReview || checkingExisting}
                  aria-label={`Set rating to ${star} star${star === 1 ? "" : "s"}`}
                  aria-pressed={rating === star}
                  className="rounded-md transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Star
                    className={cn(
                      "h-8 w-8",
                      (hoveredRating || rating) >= star
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground"
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Use arrow keys to adjust the rating after focusing a star.
            </p>
            <p className="text-xs text-muted-foreground">
              {rating > 0 && ["Poor", "Fair", "Good", "Very Good", "Excellent"][rating - 1]}
            </p>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label htmlFor="review-comment" className="text-sm font-medium">
              Comment (optional)
            </label>
            <Textarea
              id="review-comment"
              placeholder="Share details about your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={existingReview}
              maxLength={500}
              className="resize-none"
              rows={4}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/500
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || rating === 0 || existingReview || checkingExisting}
          >
            {submitting ? "Submitting..." : checkingExisting ? "Checking..." : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
