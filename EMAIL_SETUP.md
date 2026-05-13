# SkillBridge Email Notification System

## Overview

Lightweight, non-blocking email notification system using Nodemailer and simple HTTP endpoints. Emails are sent asynchronously without blocking frontend requests. System is Firestore Spark Plan compatible.

## Architecture

- **Backend Email Service**: `backend/services/emailService.js`
- **Email API Endpoints**: `backend/server.js` (`/api/email/*`)
- **Email Triggers**: `backend/services/emailTriggers.js` (helper utilities)
- **Templates**: `backend/templates/*.{html,txt}`
- **Frontend Toggle**: `frontend/src/pages/ProfilePage.tsx` (email_notifications user setting)

## Setup

### 1. Install Nodemailer

```bash
cd backend
npm install nodemailer
```

### 2. Configure SMTP

Create or update `backend/.env`:

```env
# Gmail (recommended for development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Use Gmail App Password, not your password

# OR custom SMTP provider
# SMTP_HOST=your-smtp-host.com
# SMTP_PORT=587
# SMTP_USER=your-user
# SMTP_PASS=your-pass

EMAIL_FROM="SkillBridge <no-reply@yourdomain.com>"
NODE_ENV=development
```

### Gmail App Password Setup

1. Enable 2-Step Verification on your Google Account: https://myaccount.google.com/security
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Copy 16-character password to `SMTP_PASS` in `.env`

**Development**: If SMTP is not configured, Ethereal test account is used automatically.

### 3. Run Backend

```bash
npm run dev  # from root, or npm run dev:backend
```

Backend listens on `http://localhost:3001` and provides:
- `/api/email/welcome` — POST welcome email
- `/api/email/match-accepted` — POST match accepted email
- `/api/email/review-received` — POST review received email
- `/api/email/request-completed` — POST request completed email

## Integration Points

### Welcome Email (on User Signup)

In your signup/auth flow:

```javascript
import emailTriggers from "@/services/emailTriggers.js";

// After user is created in Firestore
await emailTriggers.welcomeEmail(
  user.email,
  profile.displayName,
  user.uid
);
```

### Match Accepted Email

When a match is accepted:

```javascript
// In your match acceptance handler
await emailTriggers.matchAcceptedEmail(
  matchedUser.email,
  matchedUser.displayName,
  currentUser.displayName,
  matchedSkill,
  matchId
);
```

### Review Received Email

After review is submitted:

```javascript
import emailTriggers from "@/services/emailTriggers.js";

// In ReviewSubmissionDialog success handler or backend listener
await emailTriggers.reviewReceivedEmail(
  reviewedUser.email,
  reviewedUser.displayName,
  reviewerName,
  rating,
  comment,
  reviewId
);
```

### Request Completed Email

When request status changes to "completed":

```javascript
await emailTriggers.requestCompletedEmail(
  requester.email,
  requester.displayName,
  request.title,
  request.id
);
```

## Email Preference Toggle

Users can disable emails in Profile → Email Notifications toggle. Frontend saves `email_notifications: true|false` to Firestore user profile.

**Backend responsibility**: Before sending any email, check `user.email_notifications` flag:

```javascript
// In your trigger code
const userProfile = await db.collection("users").doc(userId).get();
if (userProfile.data()?.email_notifications === false) {
  return; // skip email send
}

await emailTriggers.matchAcceptedEmail(...);
```

## Email Templates

Plain HTML + text templates with simple `{{variable}}` interpolation.

- `welcome.html` / `welcome.txt` — New account welcome
- `match_accepted.html` / `match_accepted.txt` — Match accepted notification
- `review_received.html` / `review_received.txt` — Review received notification
- `request_completed.html` / `request_completed.txt` — Request completed notification

### Adding Custom Templates

1. Create `backend/templates/custom-name.html` and `.txt`
2. Use `{{varName}}` for interpolation
3. Call `emailService.sendTemplate("custom-name", { to: email, vars: { varName: value } })`

## Non-Blocking Behavior

All email sends are **fire-and-forget**:
- API endpoints return `202 Accepted` immediately
- Actual send happens asynchronously
- Frontend/backend requests never blocked by email delays
- Failures are logged but don't crash the app

## Duplicate Prevention

Short-lived in-memory cache (30-second TTL) prevents duplicate sends within the same process.

- Key: `${type}:${email}:${eventId}`
- Useful for preventing duplicate emails if same event is processed multiple times

## Error Handling

- **SMTP not configured**: Skipped gracefully, logged as warning
- **Network error**: Logged as error, no exception thrown
- **Invalid email**: Validation happens at endpoint level (requires `email` field)

## Testing Email Sends

### Development (Ethereal)

If no SMTP configured, emails are sent to Ethereal test account:

```
✓ Preview URL: https://ethereal.email/messages/...
```

View in browser to see rendered HTML.

### Using `curl`

```bash
curl -X POST http://localhost:3001/api/email/welcome \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","uid":"user123"}'
```

Expected response:
```json
{"status":"scheduled"}
```

## Performance & Spark Plan Safety

✅ **Firestore Spark Plan Compatible**:
- No new Firestore collections
- No cloud functions
- No queue systems
- Email preferences stored in existing `users` collection

✅ **Performance**:
- Non-blocking, async sends (~202 response immediate)
- Simple in-memory dedupe (no DB lookups)
- Minimal backend memory overhead
- No polling, no listeners, no real-time infrastructure

## Troubleshooting

### Emails not sending

1. Check `.env` has `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`
2. Check Gmail App Password is correct (16 chars, no spaces)
3. Check backend logs: `npm run dev:backend`
4. Test SMTP connection with `npm run test:email` (if added)

### "Email transporter not configured"

This is a warning, not an error. Email will skip gracefully. Add SMTP config to `.env`.

### Emails sent but recipient doesn't receive

1. Check spam folder
2. Verify `EMAIL_FROM` domain has SPF/DKIM records
3. Gmail may block less-secure apps (use App Password instead)

## Integration Checklist

- [ ] `npm install nodemailer` in backend
- [ ] Add SMTP config to `backend/.env`
- [ ] Import `emailTriggers` where you need email sends
- [ ] Check `user.email_notifications` before sending
- [ ] Run backend: `npm run dev:backend`
- [ ] Test welcome email via `POST /api/email/welcome`
- [ ] Test toggle in Profile page
- [ ] Verify no console errors in backend/frontend
- [ ] (Optional) Add email send logging to match/review/request handlers

## Next Steps

1. **Backend Integration**: Add email triggers to auth signup, match accept, review submit, request complete flows
2. **Frontend Integration**: Optionally show toast when email is sent (e.g., "Confirmation email sent")
3. **Monitoring**: Add basic email send logging to track delivery
4. **Analytics**: (Optional) Track which emails bounce or fail

---

For questions or issues, check backend logs: `npm run dev:backend | grep -i email`
