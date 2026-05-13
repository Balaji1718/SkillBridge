import { User } from "firebase/auth";

const STORAGE_KEY = "skillbridge.onboarding.dismissed";

export function isOnboardingDismissed(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === "1";
  } catch {
    return false;
  }
}

export function dismissOnboarding() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // ignore
  }
}

export function resetOnboarding() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function shouldShowOnboarding(profile: any | null): boolean {
  if (isOnboardingDismissed()) return false;
  if (!profile) return true; // not signed in yet — still show welcome

  const hasName = !!profile.displayName;
  const hasBio = !!profile.bio;
  const hasOffered = Array.isArray(profile.skills_offered) && profile.skills_offered.length > 0;
  const hasNeeded = Array.isArray(profile.skills_needed) && profile.skills_needed.length > 0;

  // Show onboarding if profile is incomplete
  return !(hasName && hasBio && hasOffered && hasNeeded);
}
