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
    const isLocalStaticPage = window.location.protocol === "file:" || (window.location.hostname === "127.0.0.1" && window.location.port !== "3000");
    const apiBaseUrl = isLocalStaticPage ? "http://localhost:3000" : "";
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

    return response.json();
  }

  window.GeminiApi = {
    callGeminiApi,
    getGeminiConfig,
    hasGeminiApiKey
  };
})();
