import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "SkillBridge backend" });
});

app.listen(port, () => {
  console.log(`SkillBridge backend listening on http://localhost:${port}`);
});
