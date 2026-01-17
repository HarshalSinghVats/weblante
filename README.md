# 🛡️ Weblante

**Real-time web safety for kids — intent-based, not just site-based.**

Weblante is a browser extension + backend system that blocks harmful content
by analyzing **what a user is trying to search**, not just which website they visit.

---

## 🚨 Why Weblante?

Most filters fail because they:
- Trust search engines blindly
- Use static blocklists
- Miss obfuscated searches (`p0rn`, `s3x`, `sexvideos`)
- React after the page loads

Weblante fixes this by detecting **intent** at navigation time.

---

## ✅ What It Does

- Analyzes **every navigation**
- Inspects **search queries** (Google & Brave)
- Detects **adult intent**, even when obfuscated
- Blocks **instantly** with a clear reason
- Allows safe pages **silently**
- No infinite reloads, MV3-safe

---

## 🧠 How It Works

# 🛡️ Weblante

**Real-time web safety for kids — intent-based, not just site-based.**

Weblante is a browser extension + backend system that blocks harmful content
by analyzing **what a user is trying to search**, not just which website they visit.

---

## 🚨 Why SafeBrowse?

Most filters fail because they:
- Trust search engines blindly
- Use static blocklists
- Miss obfuscated searches (`p0rn`, `s3x`, `sexvideos`)
- React after the page loads

Weblante fixes this by detecting **intent** at navigation time.

---

## ✅ What It Does

- Analyzes **every navigation**
- Inspects **search queries** (Google & Brave)
- Detects **adult intent**, even when obfuscated
- Blocks **instantly** with a clear reason
- Allows safe pages **silently**
- No infinite reloads, MV3-safe

---

## 🧠 How It Works
- Browser → Extension → Backend → Decision → Enforce


### Decision Logic (Backend)
1. Block known adult domains
2. Check Safe Browsing (malware/phishing)
3. Analyze URL paths
4. Keyword + fuzzy intent detection
5. Block on high-risk intent
6. Allow otherwise

Search queries are **never cached** and always re-analyzed.

---

## 🔍 Smart Intent Detection

- High-risk keywords (e.g. `porn`, `sex videos`) → instant block
- Fuzzy matching (`p0rn`, `s3x`, `se×`) supported
- Search intent ≠ trusted domain

---

## 🧩 Tech Stack

- **Extension:** Chrome / Brave (Manifest V3)
- **Backend:** Node.js + Express
- **Heuristics:** Domain, path, keywords, Safe Browsing
- **Architecture:** Block-only UI, silent allow

---

## 🏆 Why This Is Different

- Detects **intent**, not just URLs
- Works on **search engines**
- Handles **SPA navigation**
- Designed for **real-world evasion**
- Explainable decisions (parent-friendly)

---

## 🚀 Hackathon Note

This project focuses on **correct architecture over demos**.
ML and image analysis are intentionally avoided to keep decisions fast,
transparent, and reliable.

---

## 📌 Future Work

- Age-based policies
- Education-safe exceptions
- Multilingual intent detection
- Parent dashboard

---

**Built for safer browsing — by design.**
