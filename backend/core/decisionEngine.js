// decisionEngine.js

import {
  getCachedDecision,
  setCachedDecision
} from "../cache/decisionCache.js";

import { checkAdultDomain } from "../heuristics/adultDomain.js";
import { checkAllowlist } from "../heuristics/allowlist.js";
import { scanTextSources } from "../analysis/scanTextSources.js";
import { checkSafeBrowsing } from "../reputation/safeBrowsing.js";
import { checkUrlPath } from "../heuristics/urlPath.js";
import { geminiCheck } from "../analysis/geminiCheck.js";
import { fuzzyCheck } from "../analysis/fuzzyCheck.js";

import fetch from "node-fetch";
import db from "../firebase.js";

const SAFE_BROWSING_KEY = process.env.SAFE_BROWSING_KEY;
const lastSeen = new Map();

/* ---------------- CONSTANTS ---------------- */

const SOCIAL_MEDIA_DOMAINS = [
  "instagram.com",
  "facebook.com",
  "snapchat.com",
  "tiktok.com",
  "x.com",
  "twitter.com",
  "reddit.com",
  "tumblr.com"
];

/* ---------------- HELPERS ---------------- */

function isSocialMedia(url) {
  return SOCIAL_MEDIA_DOMAINS.some(d => url.includes(d));
}

function safeDecode(input, passes = 3) {
  if (!input) return "";
  let out = input;
  for (let i = 0; i < passes; i++) {
    try {
      const d = decodeURIComponent(out.replace(/\+/g, " "));
      if (d === out) break;
      out = d;
    } catch {
      break;
    }
  }
  return out;
}

function truncateUrlForDecision(rawUrl) {
  try {
    const u = new URL(rawUrl);

    let host = u.hostname.toLowerCase();
    if (host.startsWith("www.")) host = host.slice(4);

    const path = u.pathname.toLowerCase();

    const q =
      u.searchParams.get("q") ||
      u.searchParams.get("search_query");

    if (q) {
      return `${host}${path}?q=${safeDecode(q)}`;
    }

    return `${host}${path}`;
  } catch {
    return String(rawUrl || "").toLowerCase();
  }
}

function extractSearchQuery(rawUrl) {
  const decoded = safeDecode(rawUrl);

  try {
    const u = new URL(decoded);
    const PARAMS = [
      "q",
      "oq",
      "as_q",
      "query",
      "search",
      "search_query",
      "k",
      "sr",
      "p",
      "text",
      "wd",
      "keywords"
    ];

    for (const p of PARAMS) {
      const v = u.searchParams.get(p);
      if (v) return safeDecode(v).trim();
    }
  } catch {}

  return "";
}

/* ---------------- AGE POLICY ---------------- */

function resolveAgePolicy(age) {
  if (age >= 9 && age <= 12) return { class: "PRE_TEEN", threshold: 0.4 };
  if (age >= 13 && age <= 15) return { class: "TEEN", threshold: 0.5 };
  if (age >= 16 && age <= 17) return { class: "EARLY_ADULT", threshold: 0.6 };
  return null;
}

/* ---------------- LOGGING ---------------- */

async function logActivity({
  url,
  verdict,
  riskScore,
  reasons,
  stage
}) {
  const now = Date.now();
  const sessionKey = global.SESSION_ID || "default";

  const prev = lastSeen.get(sessionKey);
  const durationMs = prev ? now - prev.time : 0;
  lastSeen.set(sessionKey, { time: now });

  await db.collection("activity").add({
    url: truncateUrlForDecision(url),
    decision: verdict,
    riskScore,
    reasons,
    primaryReason: reasons?.[0] ?? null,
    stage,
    durationMs,
    timestamp: now,
    age: global.CHILD_AGE ?? null,
    ageClass: global.AGE_CLASS ?? null,
    sessionId: global.SESSION_ID ?? null
  });
}

/* ================= MAIN ENGINE ================= */

export async function decideNavigation(input) {

  const rawUrl = input.url;
  const url = truncateUrlForDecision(rawUrl);

  const searchQuery = extractSearchQuery(rawUrl);
  const isSearch = searchQuery.length > 0;

  const agePolicy =
    typeof global.CHILD_AGE === "number"
      ? resolveAgePolicy(global.CHILD_AGE)
      : null;

  if (agePolicy) global.AGE_CLASS = agePolicy.class;

  /* 🚫 ABSOLUTE EXPLICIT SEARCH */
  if (
    isSearch &&
    /s[\W_]*x|sex|porn|xxx|xvideos|xnxx|hentai|nude|blowjob|fuck/i.test(searchQuery)
  ) {
    const decision = {
      verdict: "block",
      riskScore: 1,
      reasons: ["Explicit search intent detected"],
      stage: "EXPLICIT_SEARCH"
    };
    await logActivity({ url, ...decision });
    return decision;
  }

  /* AGE-BASED SOCIAL MEDIA */
  if (agePolicy && global.CHILD_AGE < 16 && isSocialMedia(url)) {
    const decision = {
      verdict: "block",
      riskScore: 0.9,
      reasons: ["Blocked by age-based policy"],
      stage: "AGE_SOCIAL_MEDIA"
    };
    await logActivity({ url, ...decision });
    return decision;
  }

  /* ADULT DOMAIN */
  const adultDomainResult = checkAdultDomain(url);
  if (adultDomainResult.hit) {
    const decision = {
      verdict: "block",
      riskScore: 1,
      reasons: [adultDomainResult.reason],
      stage: "ADULT_DOMAIN"
    };
    await logActivity({ url, ...decision });
    return decision;
  }

  /* SAFE BROWSING */
  const safeResult = await checkSafeBrowsing(url, SAFE_BROWSING_KEY);
  if (safeResult.hit) {
    const decision = {
      verdict: "block",
      riskScore: 1,
      reasons: [safeResult.reason],
      stage: "SAFE_BROWSING"
    };
    await logActivity({ url, ...decision });
    return decision;
  }

  /* KEYWORD ANALYSIS */
  const keywordResult = isSearch
    ? scanTextSources({ body: searchQuery })
    : scanTextSources(input);

  if (isSearch && keywordResult.hardBlock) {
    const decision = {
      verdict: "block",
      riskScore: 1,
      reasons: keywordResult.reasons,
      stage: "KEYWORD_HARD"
    };
    await logActivity({ url, ...decision });
    return decision;
  }

  if (isSearch && agePolicy && keywordResult.score >= agePolicy.threshold) {
    const decision = {
      verdict: "block",
      riskScore: keywordResult.score,
      reasons: keywordResult.reasons,
      stage: "KEYWORD_THRESHOLD"
    };
    await logActivity({ url, ...decision });
    return decision;
  }

  /* FUZZY */
  if (isSearch && fuzzyCheck(searchQuery)) {
    const decision = {
      verdict: "block",
      riskScore: 0.55,
      reasons: ["Obfuscated explicit keyword detected"],
      stage: "FUZZY"
    };
    await logActivity({ url, ...decision });
    return decision;
  }

  /* GEMINI */
  if (
    isSearch &&
    agePolicy &&
    searchQuery.length > 3
  ) {
    const verdict = await geminiCheck(searchQuery, agePolicy.class);
    if (verdict === "UNSAFE") {
      const decision = {
        verdict: "block",
        riskScore: 0.8,
        reasons: ["Blocked by AI content moderation"],
        stage: "GEMINI"
      };
      await logActivity({ url, ...decision });
      return decision;
    }
  }

  /* ALLOWLIST */
  const allowResult = checkAllowlist(url);
  if (allowResult.hit) {
    const decision = {
      verdict: "allow",
      riskScore: 0,
      reasons: [allowResult.reason],
      stage: "ALLOWLIST"
    };
    await logActivity({ url, ...decision });
    setCachedDecision(url, decision);
    return decision;
  }

  /* DEFAULT ALLOW */
  const decision = {
    verdict: "allow",
    riskScore: keywordResult.score || 0,
    reasons: keywordResult.reasons || [],
    stage: "DEFAULT_ALLOW"
  };

  await logActivity({ url, ...decision });
  setCachedDecision(url, decision);
  return decision;
}
