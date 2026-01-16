const ENDPOINT =
  "https://safebrowsing.googleapis.com/v4/threatMatches:find";

const TIMEOUT_MS = 200;

export async function checkSafeBrowsing(url, apiKey) {
  if (!apiKey) return { hit: false };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const body = {
    client: {
      clientId: "safebrowse",
      clientVersion: "1.0"
    },
    threatInfo: {
      threatTypes: [
        "MALWARE",
        "SOCIAL_ENGINEERING",
        "UNWANTED_SOFTWARE",
        "POTENTIALLY_HARMFUL_APPLICATION"
      ],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [{ url }]
    }
  };

  try {
    const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!res.ok) return { hit: false };

    const data = await res.json();
    console.log("SB RESPONSE:", JSON.stringify(data));

    if (data.matches?.length) {
      return {
        hit: true,
        reason: "Unsafe site (phishing or malware detected)"
      };
    }

    return { hit: false };
  } catch {
    return { hit: false };
  } finally {
    clearTimeout(timeout);
  }
}
