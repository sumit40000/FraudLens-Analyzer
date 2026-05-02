async function readBody(request) {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
    });

    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });

    request.on("error", reject);
  });
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    if (!apiKey || apiKey === "PASTE_YOUR_GEMINI_API_KEY_HERE") {
      response.status(503).json({ error: "Gemini API key is not configured." });
      return;
    }

    const payload = await readBody(request);

    if (!payload.prompt) {
      response.status(400).json({ error: "Missing prompt." });
      return;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const geminiResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: payload.prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 900
        }
      })
    });

    const data = await geminiResponse.json().catch(() => ({}));

    if (!geminiResponse.ok) {
      response.status(geminiResponse.status).json({
        error: data.error?.message || "Gemini request failed."
      });
      return;
    }

    response.status(200).json({
      finishReason: data.candidates?.[0]?.finishReason || null,
      text: data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ""
    });
  } catch (error) {
    response.status(500).json({ error: error.message || "Server error." });
  }
};
