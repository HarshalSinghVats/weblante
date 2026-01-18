import "dotenv/config";
import express from "express";
import readline from "readline";
import crypto from "crypto";
import { decideNavigation } from "./core/decisionEngine.js";
import { resolveAgePolicy } from "./core/agePolicy.js"; // ✅ ADD THIS

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
global.AGE_CLASS = null;              // ✅ ENSURE DEFINED
global.SESSION_ID = crypto.randomUUID();
global.LAST_SEARCH_QUERY = null;

// ─────────────────────────────
// URL formatter for console logs
// ─────────────────────────────
function formatUrlForLog(rawUrl) {
  try {
    const u = new URL(rawUrl);

    let host = u.hostname.toLowerCase();
    if (host.startsWith("www.")) host = host.slice(4);

    const path = u.pathname.toLowerCase();

    const q =
      u.searchParams.get("q") ||
      u.searchParams.get("oq") ||
      u.searchParams.get("as_q") ||
      u.searchParams.get("search_query") ||
      u.searchParams.get("k") ||
      u.searchParams.get("p") ||
      u.searchParams.get("text") ||
      u.searchParams.get("wd") ||
      u.searchParams.get("keywords");

    if (q) {
      const decoded = decodeURIComponent(q.replace(/\+/g, " "));
      global.LAST_SEARCH_QUERY = decoded;
      return `${host}${path}?q=${decoded}`;
    }

    if (global.LAST_SEARCH_QUERY) {
      return `${host}${path} (last search: ${global.LAST_SEARCH_QUERY})`;
    }

    return `${host}${path}`;
  } catch {
    return String(rawUrl || "").toLowerCase();
  }
}

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

  // ✅ SET AGE CLASS ONCE
  const agePolicy = resolveAgePolicy(global.CHILD_AGE);
  if (agePolicy) {
    global.AGE_CLASS = agePolicy.class;
  }

  console.log("Session age set to:", global.CHILD_AGE);
  console.log("Age class:", global.AGE_CLASS);
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
      `[DECISION] ${decision.verdict.toUpperCase()} — ${formatUrlForLog(url)}`,
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
  