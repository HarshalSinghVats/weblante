import "dotenv/config";
import express from "express";
import { decideNavigation } from "./core/decisionEngine.js";

const app = express();
const PORT = 3000;

app.use(express.json());

console.log(
  "SB KEY:",
  process.env.SAFE_BROWSING_KEY ? "LOADED" : "MISSING"
);

/**
 * POST /analyze
 * Body:
 * {
 *   url: string,
 *   title?: string,
 *   description?: string,
 *   body?: string
 * }
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

app.listen(PORT, () => {
  console.log(`Weblante backend running on http://localhost:${PORT}`);
});
