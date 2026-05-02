(function () {
  function getAiConfig() {
    return window.GeminiApi.getGeminiConfig();
  }

  function buildExplanationPrompt(content, result) {
    const signalNames = result.signals.map((signal) => signal.title).join(", ") || "none";
    return [
      "You are a fraud safety assistant for a hackathon app.",
      "Explain this fraud detection result in simple, clear language.",
      "Write 5 to 7 useful sentences.",
      "Include the verdict, the main reasons, what the sender may be trying to do, and practical safety steps.",
      "Do not exaggerate beyond the provided signals, but be firm when the verdict is Fraud.",
      `Verdict: ${result.verdict.label}`,
      `Score: ${result.score}/100`,
      `Signals: ${signalNames}`,
      `Content: ${content}`
    ].join("\n");
  }

  function createLocalExplanation(content, result) {
    const topSignals = result.signals.slice(0, 3).map((signal) => signal.title.toLowerCase());
    const reason = topSignals.length
      ? `Main reason: ${topSignals.join(", ")}.`
      : "Main reason: the message does not contain strong fraud patterns from the current rule set.";

    if (result.verdict.label === "Fraud") {
      return `${reason} Do not click links, do not share OTP, PIN, CVV, or payment details, and verify through the official app or website.`;
    }

    if (result.verdict.label === "Suspicious") {
      return `${reason} Verify the sender and link destination before taking action. Avoid making payments or sharing private details from this message alone.`;
    }

    return `${reason} It looks normal based on local checks, but still confirm unexpected payment, account, or login requests from an official source.`;
  }

  async function requestGeminiExplanation(prompt, config) {
    return window.GeminiApi.callGeminiApi(prompt, config);
  }

  async function requestAiExplanation(content, result) {
    const config = getAiConfig();
    const prompt = buildExplanationPrompt(content, result);

    if (!config.apiKey) {
      return {
        available: false,
        source: "rule-based",
        prompt,
        reason: "Gemini API key is not configured.",
        text: createLocalExplanation(content, result)
      };
    }

    const geminiResult = await requestGeminiExplanation(prompt, config);
    const text = geminiResult.text || "";

    if (!text) {
      throw new Error("Gemini response was empty.");
    }

    return {
      available: true,
      source: "gemini",
      finishReason: geminiResult.finishReason,
      prompt,
      text
    };
  }

  window.FraudAiHelper = {
    buildExplanationPrompt,
    createLocalExplanation,
    getAiConfig,
    requestAiExplanation,
    requestGeminiExplanation
  };
})();
