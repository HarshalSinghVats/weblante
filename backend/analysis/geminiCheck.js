import fetch from "node-fetch";

const GEMINI_KEY = process.env.GEMINI_KEY;

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

export async function geminiCheck({ text, ageClass }) {
  console.log("[GEMINI] invoked for age class:", ageClass);

  if (!GEMINI_KEY) {
    console.warn("[GEMINI] key missing — skipping");
    return "SAFE";
  }

  const prompt = `
You are a STRICT child-safety and wellbeing content moderator.

User age category: ${ageClass}

Age categories meaning:
- PRE_TEEN (9–12): extremely strict, no sexual, suggestive, violent, or mature content.
- TEEN (13–15): strict, block sexual, pornographic, fetish, or explicit material.
- EARLY_ADULT (16–17): still minor, allow mild discussion but block explicit adult content.

Task:
Analyze the given text and decide whether it is SAFE or UNSAFE for the user.

Rules:
- Respond with EXACTLY ONE WORD.
- Output must be either SAFE or UNSAFE.
- Do NOT explain.
- If unsure, respond UNSAFE.

Text to analyze:
"""
${text}
"""
`;

  try {
    const res = await fetch(
      `${GEMINI_ENDPOINT}?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    const data = await res.json();

    const output =
      data?.candidates?.[0]?.content?.parts?.[0]?.text
        ?.trim()
        ?.toUpperCase();

    console.log("[GEMINI] response:", output);

    return output === "UNSAFE" ? "UNSAFE" : "SAFE";
  } catch (err) {
    console.error("[GEMINI] error:", err.message);
    return "SAFE";
  }
}
