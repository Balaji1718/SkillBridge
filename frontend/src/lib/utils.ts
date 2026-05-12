import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Normalize skills for consistent matching across variants
// e.g., React, React.js, reactjs all normalize to 'react'
export function normalizeSkill(skill: string): string {
  return skill
    .toLowerCase()
    .trim()
    .replace(/[\s._-]+/g, '') // remove spaces, dots, underscores, hyphens
    .replace(/js$/g, '') // remove trailing 'js'
    .replace(/\.js$/g, ''); // remove trailing '.js'
}

// Check if a skill string contains another skill (with normalization)
export function skillMatches(haystack: string, needle: string): boolean {
  const normalizedHaystack = normalizeSkill(haystack);
  const normalizedNeedle = normalizeSkill(needle);
  return normalizedHaystack.includes(normalizedNeedle) || normalizedNeedle.includes(normalizedHaystack);
}

// Partial match for search
export function partialMatch(text: string | undefined | null, query: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(query.toLowerCase().trim());
}

// Calculate profile completion percentage (same as Feature 2)
export function calculateProfileCompletion(profile: {
  displayName?: string;
  bio?: string;
  skills_offered?: string[];
  skills_needed?: string[];
}): number {
  let score = 0;
  if (profile.displayName?.trim()) score += 25;
  if (profile.bio?.trim()) score += 25;
  if ((profile.skills_offered?.length || 0) >= 1) score += 25;
  if ((profile.skills_needed?.length || 0) >= 1) score += 25;
  return score;
}

// Calculate compatibility score between two users (0-100)
// Considers: reciprocal skill match, profile completeness, rating, availability overlap
export function calculateCompatibilityScore(
  userA: {
    uid?: string;
    displayName?: string;
    bio?: string;
    skills_offered?: string[];
    skills_offered_with_levels?: Array<{ skill: string; level: string }>;
    skills_needed?: string[];
    skills_needed_with_levels?: Array<{ skill: string; level: string }>;
    rating?: number;
    availability_preferences?: string[];
  },
  userB: {
    uid?: string;
    displayName?: string;
    bio?: string;
    skills_offered?: string[];
    skills_offered_with_levels?: Array<{ skill: string; level: string }>;
    skills_needed?: string[];
    skills_needed_with_levels?: Array<{ skill: string; level: string }>;
    rating?: number;
    availability_preferences?: string[];
  }
): number {
  let score = 0;

  // 1. Reciprocal skill match (40 points max)
  const aOffers = [
    ...(userA.skills_offered || []),
    ...(userA.skills_offered_with_levels?.map((s) => s.skill) || []),
  ];
  const aNeeds = [
    ...(userA.skills_needed || []),
    ...(userA.skills_needed_with_levels?.map((s) => s.skill) || []),
  ];
  const bOffers = [
    ...(userB.skills_offered || []),
    ...(userB.skills_offered_with_levels?.map((s) => s.skill) || []),
  ];
  const bNeeds = [
    ...(userB.skills_needed || []),
    ...(userB.skills_needed_with_levels?.map((s) => s.skill) || []),
  ];

  // Check reciprocal matches
  let reciprocalMatches = 0;
  for (const aOffer of aOffers) {
    if (bNeeds.some((s) => skillMatches(s, aOffer))) reciprocalMatches++;
  }
  for (const bOffer of bOffers) {
    if (aNeeds.some((s) => skillMatches(s, bOffer))) reciprocalMatches++;
  }

  if (reciprocalMatches > 0) {
    score += Math.min(40, 15 + reciprocalMatches * 5);
  }

  // 2. Skill overlap bonus (20 points max)
  const skillOverlap = aOffers.filter((s) => bOffers.some((b) => skillMatches(s, b))).length;
  score += Math.min(20, skillOverlap * 5);

  // 3. Profile completeness (25 points max)
  const completionA = calculateProfileCompletion(userA);
  const completionB = calculateProfileCompletion(userB);
  const avgCompletion = (completionA + completionB) / 2;
  score += (avgCompletion / 100) * 25;

  // 4. Rating quality (10 points max - optional lightweight factor)
  const ratingA = (userA.rating || 0) / 5; // normalize to 0-1
  const ratingB = (userB.rating || 0) / 5;
  const avgRating = (ratingA + ratingB) / 2;
  score += avgRating * 10;

  // 5. Availability overlap (5 points max - optional)
  if (userA.availability_preferences && userB.availability_preferences) {
    const hasOverlap = userA.availability_preferences.some((a) =>
      userB.availability_preferences?.includes(a)
    );
    if (hasOverlap) score += 5;
  }

  // Cap at 100
  return Math.min(100, Math.round(score));
}

// Achievement badge computation (frontend-friendly, lightweight)
export type AchievementBadge = {
  id: string;
  title: string;
  description: string;
  icon: string; // emoji or short text fallback
  earned: boolean;
};

export function computeBadges(profile: any): AchievementBadge[] {
  const badges: AchievementBadge[] = [];
  if (!profile) return badges;

  const exchanges = profile.exchanges_completed || 0;
  const rating = profile.rating || 0;
  const offeredCount = (profile.skills_offered?.length || 0) + (profile.skills_offered_with_levels?.length || 0);
  const neededCount = (profile.skills_needed?.length || 0) + (profile.skills_needed_with_levels?.length || 0);
  const totalSkills = offeredCount + neededCount;
  const completion = calculateProfileCompletion(profile);

  badges.push({
    id: "first-exchange",
    title: "First Exchange",
    description: "Completed your first exchange",
    icon: "🏅",
    earned: exchanges >= 1,
  });

  badges.push({
    id: "active-collaborator",
    title: "Active Collaborator",
    description: "Completed multiple exchanges",
    icon: "🤝",
    earned: exchanges >= 3,
  });

  badges.push({
    id: "multi-skill",
    title: "Multi-Skill User",
    description: "Offers or needs several skills",
    icon: "🧰",
    earned: totalSkills >= 3,
  });

  badges.push({
    id: "highly-rated",
    title: "Highly Rated",
    description: "Consistently receives positive ratings",
    icon: "🌟",
    earned: rating >= 4.5 && exchanges > 0,
  });

  badges.push({
    id: "profile-complete",
    title: "Profile Complete",
    description: "Bio, skills and basics filled out",
    icon: "✅",
    earned: completion >= 100,
  });

  badges.push({
    id: "skill-explorer",
    title: "Skill Explorer",
    description: "Has listed multiple skills",
    icon: "🔎",
    earned: totalSkills >= 2,
  });

  badges.push({
    id: "top-mentor",
    title: "Top Mentor",
    description: "High rating and several exchanges",
    icon: "🧑‍🏫",
    earned: rating >= 4.7 && exchanges >= 5,
  });

  // Optional badges that rely on explicit fields if present
  if (typeof profile.contributions_count === "number") {
    badges.push({
      id: "community-contributor",
      title: "Community Contributor",
      description: "Contributed helpful resources",
      icon: "📣",
      earned: profile.contributions_count >= 1,
    });
  }

  if (profile.createdAt) {
    try {
      const created = profile.createdAt.seconds ? new Date(profile.createdAt.seconds * 1000) : new Date(profile.createdAt);
      const days = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
      badges.push({
        id: "early-adopter",
        title: "Early Adopter",
        description: "Joined the platform early",
        icon: "🕰️",
        earned: days >= 365, // earned if account older than a year
      });
    } catch {
      // ignore parse errors
    }
  }

  if (profile.fast_responder === true) {
    badges.push({
      id: "fast-responder",
      title: "Fast Responder",
      description: "Quick to reply to exchanges",
      icon: "⚡",
      earned: true,
    });
  }

  return badges;
}

// Personal Analytics computation (Feature 11)
export type PersonalAnalytics = {
  profileCompletion: number;
  skillsOffered: number;
  skillsNeeded: number;
  totalSkills: number;
  exchangesCompleted: number;
  averageRating: number;
  achievementCount: number;
  topOfferedSkills: string[];
  topNeededSkills: string[];
  accountAgeInDays: number;
  accountAgeTier: "new" | "growing" | "established" | "veteran";
};

export function computePersonalAnalytics(profile: any): PersonalAnalytics {
  if (!profile) {
    return {
      profileCompletion: 0,
      skillsOffered: 0,
      skillsNeeded: 0,
      totalSkills: 0,
      exchangesCompleted: 0,
      averageRating: 0,
      achievementCount: 0,
      topOfferedSkills: [],
      topNeededSkills: [],
      accountAgeInDays: 0,
      accountAgeTier: "new",
    };
  }

  // Profile completion
  const profileCompletion = calculateProfileCompletion(profile);

  // Skills count
  const skillsOffered = (profile.skills_offered?.length || 0) + (profile.skills_offered_with_levels?.length || 0);
  const skillsNeeded = (profile.skills_needed?.length || 0) + (profile.skills_needed_with_levels?.length || 0);
  const totalSkills = skillsOffered + skillsNeeded;

  // Exchanges
  const exchangesCompleted = profile.exchanges_completed || 0;

  // Rating
  const averageRating = profile.rating || 0;

  // Achievements (count earned badges)
  const badges = computeBadges(profile);
  const achievementCount = badges.filter((b) => b.earned).length;

  // Top skills
  const topOfferedSkills = profile.skills_offered?.slice(0, 3) || [];
  const topNeededSkills = profile.skills_needed?.slice(0, 3) || [];

  // Account age calculation
  let accountAgeInDays = 0;
  let accountAgeTier: "new" | "growing" | "established" | "veteran" = "new";

  if (profile.createdAt) {
    try {
      const created = profile.createdAt.seconds ? new Date(profile.createdAt.seconds * 1000) : new Date(profile.createdAt);
      accountAgeInDays = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));

      if (accountAgeInDays >= 365) accountAgeTier = "veteran";
      else if (accountAgeInDays >= 180) accountAgeTier = "established";
      else if (accountAgeInDays >= 30) accountAgeTier = "growing";
      else accountAgeTier = "new";
    } catch {
      // ignore parse errors
    }
  }

  return {
    profileCompletion,
    skillsOffered,
    skillsNeeded,
    totalSkills,
    exchangesCompleted,
    averageRating,
    achievementCount,
    topOfferedSkills,
    topNeededSkills,
    accountAgeInDays,
    accountAgeTier,
  };
}
