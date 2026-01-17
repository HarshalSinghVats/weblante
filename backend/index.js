import "dotenv/config";
import express from "express";
import readline from "readline";
import crypto from "crypto";
import { decideNavigation } from "./core/decisionEngine.js";

const app = express();
const PORT = 3000;

app.use(express.json());

console.log(
  "SB KEY:",
  process.env.SAFE_BROWSING_KEY ? "LOADED" : "MISSING"
);

// ─────────────────────────────
// Session globals
// ─────────────────────────────
global.CHILD_AGE = null;
global.SESSION_ID = crypto.randomUUID();

// ─────────────────────────────
// Ask age BEFORE server starts
// ─────────────────────────────
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question("Enter child's age for this session: ", (answer) => {
  const age = Number(answer);
  global.CHILD_AGE = isNaN(age) ? null : age;

  console.log("Session age set to:", global.CHILD_AGE);
  console.log("Session ID:", global.SESSION_ID);

  rl.close();

  app.listen(PORT, () => {
    console.log(`Weblante backend running on http://localhost:${PORT}`);
  });
});

/**
 * POST /analyze
 */
app.post("/analyze", async (req, res) => {
  try {
    const { url, title = "", description = "", body = "" } = req.body;

    if (!url) {
      return res.status(400).json({ error: "url is required" });
    }

    const decision = await decideNavigation({
      url,
      title,
      description,
      body
    });

    console.log(
      `[DECISION] ${decision.verdict.toUpperCase()} — ${url}`,
      decision.reasons
    );

    return res.json(decision);
  } catch (err) {
    console.error("Decision error:", err);
    return res.status(500).json({
      verdict: "block",
      riskScore: 1,
      reasons: ["Internal error"]
    });
  }
});
