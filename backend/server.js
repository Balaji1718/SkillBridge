import dotenv from "dotenv";
import express from "express";
import emailService from "./services/emailService.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

// Minimal endpoints for triggering emails (non-blocking, returns 202)
app.post("/api/email/welcome", async (req, res) => {
  const { email, name, uid } = req.body;
  if (!email) return res.status(400).json({ error: "email required" });
  // fire-and-forget
  emailService.sendTemplate("welcome", { to: email, eventId: uid, vars: { name } }).catch((e) => console.error(e));
  res.status(202).json({ status: "scheduled" });
});

app.post("/api/email/match-accepted", async (req, res) => {
  const { email, name, partnerName, skill, eventId } = req.body;
  if (!email) return res.status(400).json({ error: "email required" });
  emailService.sendTemplate("match_accepted", { to: email, eventId, vars: { name, partnerName, skill } }).catch((e) => console.error(e));
  res.status(202).json({ status: "scheduled" });
});

app.post("/api/email/review-received", async (req, res) => {
  const { email, name, reviewerName, rating, comment, eventId } = req.body;
  if (!email) return res.status(400).json({ error: "email required" });
  emailService.sendTemplate("review_received", { to: email, eventId, vars: { name, reviewerName, rating, comment } }).catch((e) => console.error(e));
  res.status(202).json({ status: "scheduled" });
});

app.post("/api/email/request-completed", async (req, res) => {
  const { email, name, title, eventId } = req.body;
  if (!email) return res.status(400).json({ error: "email required" });
  emailService.sendTemplate("request_completed", { to: email, eventId, vars: { name, title } }).catch((e) => console.error(e));
  res.status(202).json({ status: "scheduled" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "SkillBridge backend" });
});

app.listen(port, () => {
  console.log(`SkillBridge backend listening on http://localhost:${port}`);
});
