module.exports = function handler(request, response) {
  if (request.method !== "GET") {
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  response.status(200).json({
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "PASTE_YOUR_GEMINI_API_KEY_HERE"),
    geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash"
  });
};
