/**
 * Email trigger helpers
 * Non-blocking email sends for SkillBridge events
 * Uses the backend email API endpoints
 */

const API_BASE = process.env.API_BASE || "http://localhost:3001";

async function triggerEmail(endpoint, payload) {
  // fire-and-forget: don't block if email send fails
  try {
    const res = await fetch(`${API_BASE}/api/email/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(`Email trigger returned ${res.status}: ${endpoint}`);
    }
    return res.ok;
  } catch (err) {
    // Log but don't throw: email is non-critical
    console.error(`Failed to trigger ${endpoint} email:`, err.message);
    return false;
  }
}

export const emailTriggers = {
  // When user signs up / creates account
  welcomeEmail: (email, name, uid) =>
    triggerEmail("welcome", { email, name, uid }),

  // When a match is accepted
  matchAcceptedEmail: (email, name, partnerName, skill, matchId) =>
    triggerEmail("match-accepted", {
      email,
      name,
      partnerName,
      skill,
      eventId: matchId,
    }),

  // When user receives a review
  reviewReceivedEmail: (email, name, reviewerName, rating, comment, reviewId) =>
    triggerEmail("review-received", {
      email,
      name,
      reviewerName,
      rating,
      comment,
      eventId: reviewId,
    }),

  // When a request is marked complete
  requestCompletedEmail: (email, name, title, requestId) =>
    triggerEmail("request-completed", {
      email,
      name,
      title,
      eventId: requestId,
    }),
};

export default emailTriggers;
