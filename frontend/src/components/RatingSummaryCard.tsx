import { useEffect, useMemo, useState } from "react";
import { AlertCircle, MessageCircle, Star } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  calculateRatingSummary,
  getRatingLabel,
  getStarColor,
  formatReviewDate,
  type Review,
} from "@/lib/reviews";

interface RatingSummaryCardProps {
  userId: string;
  userName: string;
  className?: string;
}

export default function RatingSummaryCard({
  userId,
  userName,
  className,
}: RatingSummaryCardProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadReviews = async () => {
      if (!mounted) return;

      setLoading(true);
      setError(null);

      try {
        const reviewsQuery = query(
          collection(db, "reviews"),
          where("reviewed_uid", "==", userId)
        );
        const snapshot = await getDocs(reviewsQuery);
        if (!mounted) return;
        const reviewsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Review[];
        setReviews(reviewsData);
      } catch (error) {
        console.error("Error loading reviews:", error);
        if (mounted) {
          setError("We couldn't load reviews right now.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadReviews();
    return () => {
      mounted = false;
    };
  }, [reloadToken, userId]);

  const summary = useMemo(() => calculateRatingSummary(reviews), [reviews]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="h-6 w-24 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center space-y-3">
          <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="font-medium">Couldn&apos;t load reviews</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setReloadToken((value) => value + 1)}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (summary.totalReviews === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center space-y-3">
          <MessageCircle className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="font-medium">No reviews yet</p>
            <p className="text-sm text-muted-foreground">
              Once exchanges are reviewed, the rating summary and recent feedback will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Reviews for {userName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rating overview */}
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-heading">
                  {summary.averageRating.toFixed(1)}
                </span>
                <span className="text-sm text-muted-foreground">out of 5</span>
              </div>
              <p className="text-sm font-medium text-muted-foreground mt-1">
                {getRatingLabel(summary.averageRating)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Based on {summary.totalReviews}{" "}
                {summary.totalReviews === 1 ? "review" : "reviews"}
              </p>
            </div>

            {/* Star display */}
            <div className="flex gap-1 sm:pt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-6 w-6",
                    star <= Math.round(summary.averageRating)
                      ? getStarColor(summary.averageRating)
                      : "text-muted-foreground/30"
                  )}
                  fill={
                    star <= Math.round(summary.averageRating)
                      ? "currentColor"
                      : "none"
                  }
                />
              ))}
            </div>
          </div>

          {/* Rating distribution */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = summary.distribution[rating];
              const percentage =
                summary.totalReviews > 0
                  ? Math.round((count / summary.totalReviews) * 100)
                  : 0;

              return (
                <div key={rating} className="flex items-center gap-2">
                  <div className="flex items-center gap-1 w-12">
                    <span className="text-xs font-medium">{rating}</span>
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-amber-400 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent reviews */}
        {summary.recentReviews.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-medium text-sm">Recent Reviews</h4>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {summary.recentReviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-xl border bg-muted/40 p-3 space-y-2 shadow-sm transition-colors hover:bg-muted/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {review.reviewer_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatReviewDate(review.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "h-3.5 w-3.5",
                            star <= review.rating
                              ? "text-amber-400"
                              : "text-muted-foreground/30"
                          )}
                          fill={
                            star <= review.rating ? "currentColor" : "none"
                          }
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty recent reviews state */}
        {summary.recentReviews.length === 0 && summary.totalReviews > 0 && (
          <div className="text-center py-6 border-t">
            <MessageCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No recent reviews</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
