// Profile visibility helper for Feature 25

export type ProfileVisibility = "public" | "private";

export interface UserProfileWithVisibility {
  uid: string;
  visibility?: ProfileVisibility;
  [key: string]: any;
}

/**
 * Get the visibility status of a profile.
 * Defaults to "public" for backward compatibility with existing users.
 */
export function getProfileVisibility(profile: UserProfileWithVisibility | null): ProfileVisibility {
  if (!profile) return "public";
  // If visibility field is explicitly set, use it; otherwise default to public
  return profile.visibility === "private" ? "private" : "public";
}

/**
 * Check if a profile is public.
 */
export function isProfilePublic(profile: UserProfileWithVisibility | null): boolean {
  return getProfileVisibility(profile) === "public";
}

/**
 * Check if a profile is private.
 */
export function isProfilePrivate(profile: UserProfileWithVisibility | null): boolean {
  return getProfileVisibility(profile) === "private";
}

/**
 * Filter profiles to only include public ones.
 * Used for discovery, recommendations, and trending lists.
 */
export function filterPublicProfiles<T extends UserProfileWithVisibility>(profiles: T[]): T[] {
  return profiles.filter((profile) => isProfilePublic(profile));
}
