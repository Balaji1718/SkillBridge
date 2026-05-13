/**
 * Review system utilities for SkillBridge
 * Lightweight frontend-first review aggregation
 */

export interface Review {
  id: string;
  reviewer_uid: string;
  reviewer_name: string;
  reviewed_uid: string;
  match_id: string;
  rating: number; // 1-5
  comment?: string;
  created_at: number; // milliseconds
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  distribution: {
    [key: number]: number; // { 5: 2, 4: 1, 3: 0, 2: 0, 1: 0 }
  };
  recentReviews: Review[];
}

export function calculateRatingSummary(reviews: Review[]): ReviewSummary {
  if (reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      recentReviews: [],
    };
  }

  const distribution: { [key: number]: number } = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let totalRating = 0;

  reviews.forEach((review) => {
    const safeRating = Math.max(1, Math.min(5, Math.round(review.rating)));
    distribution[safeRating] += 1;
    totalRating += safeRating;
  });

  const recentReviews = [...reviews]
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, 5);

  return {
    averageRating: Math.round((totalRating / reviews.length) * 10) / 10,
    totalReviews: reviews.length,
    distribution,
    recentReviews,
  };
}

export function getRatingLabel(rating: number): string {
  if (rating >= 4.5) return "Excellent";
  if (rating >= 4) return "Very Good";
  if (rating >= 3) return "Good";
  if (rating >= 2) return "Fair";
  return "Needs Improvement";
}

export function getStarColor(rating: number): string {
  if (rating >= 4.5) return "text-amber-500";
  if (rating >= 4) return "text-amber-400";
  if (rating >= 3) return "text-yellow-400";
  if (rating >= 2) return "text-yellow-300";
  return "text-slate-300";
}

export function formatReviewDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - timestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins === 0 ? "just now" : `${diffMins}m ago`;
    }
    return `${diffHours}h ago`;
  }

  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
