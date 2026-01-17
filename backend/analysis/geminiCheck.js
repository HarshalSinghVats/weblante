export async function geminiCheck(text) {
  const key = process.env.GEMINI_KEY;
  if (!key || !text) return null;

  const prompt = `
You are a content safety classifier for a child safety system.

Decide if the following text is SAFE or UNSAFE for a minor.

Rules:
- Explicit, sexual, pornographic, or obfuscated content is UNSAFE
- Educational or neutral content is SAFE
- Reply with ONLY one word: SAFE or UNSAFE

Text:
"""
${text.slice(0, 2000)}
"""
`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const json = await res.json();

    const answer =
      json.candidates?.[0]?.content?.parts?.[0]?.text
        ?.trim()
        ?.toUpperCase();

    if (answer === "UNSAFE") return true;
    if (answer === "SAFE") return false;

    return null;
  } catch {
    return null;
  }
}
