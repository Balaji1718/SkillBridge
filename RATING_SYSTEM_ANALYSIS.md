# SkillBridge Rating/Review System Analysis

## Current State Summary

The SkillBridge codebase has a **basic rating infrastructure in place but NO functional review/rating calculation system**. Ratings are stored as static numbers with no mechanism to create, calculate, or update them.

---

## 1. Existing Rating Data Structures

### User Profile (Firestore "users" collection)
```typescript
interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  bio: string;
  skills_offered: string[];
  skills_needed: string[];
  skills_offered_with_levels?: SkillWithLevel[];
  skills_needed_with_levels?: SkillWithLevel[];
  availability_preferences?: string[];
  avatar?: string;
  rating: number;              // ⬅️ RATING FIELD (currently static)
  exchanges_completed: number; // ⬅️ EXCHANGE COUNT
}
```

**Location:** [frontend/src/contexts/AuthContext.tsx](frontend/src/contexts/AuthContext.tsx#L31)

**Initialization:** New users get `rating: 0` and `exchanges_completed: 0` on signup

### Session History Entry (Display Structure)
```typescript
interface SessionHistoryEntry {
  key: string;
  matchId: string;
  partnerId: string;
  partnerName: string;
  offeredSkill: string;
  learnedSkill: string;
  matchStatus: string;
  completedAtMillis: number;
  completedAtLabel: string;
  relativeTimeLabel: string;
  ratingSummary?: number;      // ⬅️ PARTNER'S CURRENT RATING (optional)
  milestoneIndex: number;
}
```

**Location:** [frontend/src/lib/sessionHistory.ts](frontend/src/lib/sessionHistory.ts#L35)

### Match Record (Firestore "matches" collection)
```typescript
interface MatchHistoryRecord {
  id: string;
  userA?: string;
  userB?: string;
  userAName?: string;
  userBName?: string;
  requestA?: string;
  requestB?: string;
  skillA?: string;
  skillB?: string;
  status?: string;             // "pending", "accepted", "completed", "archived"
  createdAt?: Timestamp;
  completedAt?: Timestamp;
  completedBy?: string;
  // ⚠️ NO REVIEW OR RATING FIELDS
}
```

**Location:** [frontend/src/lib/sessionHistory.ts](frontend/src/lib/sessionHistory.ts#L7-L19)

---

## 2. How Ratings Are Currently Calculated

### ❌ **NO CALCULATION EXISTS**

**Current Implementation:**
- Ratings are stored as a static `number` field on the user profile
- No code exists to calculate or update ratings
- No review submission mechanism
- No aggregation logic

**What the Code Does:**
```typescript
// In utils.ts
const averageRating = profile.rating || 0;  // Just reads the stored value, no calculation

// Initialization
const newProfile: UserProfile = {
  // ...
  rating: 0,                    // Set to 0, never updated
  exchanges_completed: 0,
};
```

**Location:** [frontend/src/lib/utils.ts](frontend/src/lib/utils.ts#L294)

---

## 3. Existing Review Display Logic

### Where Ratings Are Displayed

| Location | Component | Display Format |
|----------|-----------|-----------------|
| **Profile Page** | PersonalAnalytics | `{rating.toFixed(1)} ⭐` |
| **Discover Page** | User Cards | `Rating: {minRating}+ ⭐` (as filter) |
| **Matches Page** | Match Cards | `Rating: {matchedRating.toFixed(1)} ⭐` |
| **Session History** | History Entry | `Partner rating {ratingSummary.toFixed(1)}` |
| **Recommended Users** | Component | `Rating: {rating.toFixed(1)} ⭐` |

### Key Display Component: PersonalAnalytics
```typescript
// Location: frontend/src/components/PersonalAnalytics.tsx
<div className="text-lg font-bold">{analytics.averageRating.toFixed(1)} ⭐</div>

// Conditions
{analytics.averageRating >= 4.7 ? "🌟 You're a top-rated mentor!" : "Keep delivering great exchanges!"}
```

### Filtering Logic
```typescript
// Location: frontend/src/pages/DiscoverPage.tsx
const [minRating, setMinRating] = useState(0);

// Filter by minimum rating
if (minRating > 0) {
  results = results.filter((u) => u.rating >= minRating);
}
```

---

## 4. Matches Collection Structure & Review Fields

### Current Matches Collection Schema

**Collection Path:** `Firestore > matches`

**Fields:**
```
matches/{matchId}
├── userA: string               // User A's UID
├── userB: string               // User B's UID
├── userAName: string           // User A's display name
├── userBName: string           // User B's display name
├── requestA: string            // Request ID from user A
├── requestB: string            // Request ID from user B
├── skillA: string              // Skill user A is teaching
├── skillB: string              // Skill user B is teaching
├── status: string              // "pending" | "accepted" | "completed" | "archived"
├── createdAt: Timestamp        // When match was created
├── completedAt: Timestamp      // When exchange was completed
└── completedBy: string         // User who marked it complete
```

### ⚠️ Missing Fields
- **❌ NO `reviews` or `ratings` field**
- **❌ NO `feedback` or `comments` field**
- **❌ NO `ratingA` or `ratingB` field**
- **❌ NO `reviewedBy` or `reviewDate` field**

**This means:**
- Reviews are **not stored with matches**
- Ratings are **not associated with specific exchanges**
- There's **no audit trail of who rated whom**
- Currently, the `rating` on the user profile is **global** (not exchange-specific)

---

## 5. Backend Code for Rating Calculations

### Backend Status: ❌ **MINIMAL/NON-EXISTENT**

**Current Backend Structure:**
- Location: `backend/`
- Entry point: `backend/server.js`

**What Exists:**
```typescript
// backend/server.js
import express from "express";

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "SkillBridge backend" });
});

app.listen(3001, () => {
  console.log(`SkillBridge backend listening on http://localhost:3001`);
});
```

**Directories Status:**
- `backend/controllers/` - **Empty** ❌
- `backend/services/` - **Empty** ❌
- `backend/routes/` - **Empty** ❌

**Backend Lib Files:**
- `backend/lib/firebase.ts` - Firebase initialization only
- `backend/lib/groq.ts` - Likely AI integration (not for ratings)
- `backend/lib/utils.ts` - Generic utilities

**No Backend Functions For:**
- ❌ Creating reviews
- ❌ Calculating average ratings
- ❌ Aggregating ratings from multiple exchanges
- ❌ Updating user rating fields
- ❌ Validating review submissions
- ❌ Handling review disputes

---

## Current Rating Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     FIRESTORE DATABASE                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  users/{uid}                                                 │
│  ├── rating: number (0-5, static, never updated) ⚠️          │
│  └── exchanges_completed: number                            │
│                                                               │
│  matches/{matchId}                                          │
│  ├── userA, userB                                           │
│  ├── status: "completed"                                    │
│  └── completedAt: timestamp                                 │
│      (NO REVIEW OR RATING FIELDS)                           │
│                                                               │
│  requests/{requestId}                                       │
│  ├── userId                                                 │
│  ├── need_skill, offer_skill                               │
│  └── status: "completed"                                    │
└─────────────────────────────────────────────────────────────┘
                            △
                            │
        ┌───────────────────┴────────────────────┐
        │                                        │
   FRONTEND                                  BACKEND
   (React)                                  (Express)
        │                                        │
   ┌─────────────────────────┐          ┌──────────────┐
   │ Read Only Display        │          │ /health only │
   │ - PersonalAnalytics      │          │              │
   │ - DiscoverPage ratings   │          │ NO ENDPOINTS │
   │ - MatchesPage ratings    │          │ FOR RATINGS  │
   │ - SessionHistory ratings │          └──────────────┘
   │                          │
   │ NO UPDATE MECHANISM      │
   │ NO REVIEW SUBMISSION     │
   └─────────────────────────┘
```

---

## Summary: What's Missing for a Full Review System

### Data Model Gaps
- [ ] Review/Rating document structure (who rated whom, score, feedback, date)
- [ ] Review fields on matches collection (to associate reviews with specific exchanges)
- [ ] Review history/audit trail
- [ ] Rating distribution (count of 5-star, 4-star reviews, etc.)

### Frontend Gaps
- [ ] Review submission form after exchange completion
- [ ] Review display component
- [ ] Review edit/delete functionality
- [ ] Review history/details page
- [ ] Rating breakdown (e.g., "4 five-star reviews, 2 four-star")

### Backend Gaps
- [ ] POST endpoint to submit reviews
- [ ] GET endpoint to retrieve reviews for a user
- [ ] PUT/PATCH endpoint to update reviews
- [ ] DELETE endpoint to remove reviews
- [ ] POST endpoint to calculate/aggregate rating from reviews
- [ ] Middleware to validate review data

### Business Logic Gaps
- [ ] Algorithm to calculate average rating from individual reviews
- [ ] Validation rules (can only review after exchange is marked complete, one review per exchange)
- [ ] Rating visibility rules (can users see who rated them?)
- [ ] Dispute/appeal mechanism for unfair ratings
- [ ] Minimum maturity (e.g., need 3 reviews before showing rating)

---

## Key Findings

| Aspect | Status | Details |
|--------|--------|---------|
| **Rating Storage** | ✅ Exists | Stored as `number` on user profile |
| **Rating Display** | ✅ Exists | Shown in 5 locations with 1 decimal format |
| **Rating Updates** | ❌ None | No code to calculate or update ratings |
| **Review Submissions** | ❌ None | No form or backend endpoint |
| **Review Storage** | ❌ None | No reviews collection; no reviews on matches |
| **Backend Calculation** | ❌ None | No backend endpoints or logic |
| **Exchange-Specific Ratings** | ❌ None | Ratings are global, not per-exchange |
| **Filtering/Sorting** | ✅ Partial | Can filter by min rating on Discover page |

---

## Recommendations for Implementation

### Phase 1: Data Model
1. Create `reviews` collection in Firestore
2. Add `review fields to matches collection (reviewA, reviewB, etc.)
3. Design review document schema (raterUID, revieweeUID, score, comment, createdAt, matchId)

### Phase 2: Backend API
1. Create review submission endpoint
2. Add rating calculation function
3. Add endpoints to retrieve reviews for a user
4. Implement validation and authorization

### Phase 3: Frontend UI
1. Create review submission modal after exchange completion
2. Build review display component showing all reviews
3. Add rating breakdown chart
4. Implement review history page

### Phase 4: Business Logic
1. Implement minimum review requirements
2. Add review moderation/dispute system
3. Create review visibility settings
4. Add rating history tracking
