(function () {
  function hasGeminiApiKey() {
    return true;
  }

  function getGeminiConfig() {
    return {
      provider: "gemini",
      apiKey: "server-managed"
    };
  }

  async function callGeminiApi(prompt) {
    const apiBaseUrl = window.location.port === "3000" ? "" : "http://localhost:3000";
    const response = await fetch(`${apiBaseUrl}/api/gemini`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Gemini request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.text || "";
  }

  window.GeminiApi = {
    callGeminiApi,
    getGeminiConfig,
    hasGeminiApiKey
  };
})();
