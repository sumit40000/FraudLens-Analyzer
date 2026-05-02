const form = document.querySelector("#analysisForm");
const input = document.querySelector("#contentInput");
const clearButton = document.querySelector("#clearButton");
const analyzeButton = document.querySelector("#analyzeButton");
const analyzeIcon = document.querySelector("#analyzeIcon");
const analyzeButtonText = document.querySelector("#analyzeButtonText");
const modelStatusText = document.querySelector("#modelStatusText");
const scoreValue = document.querySelector("#scoreValue");
const scoreRing = document.querySelector("#scoreRing");
const verdictText = document.querySelector("#verdictText");
const verdictSummary = document.querySelector("#verdictSummary");
const meterFill = document.querySelector("#meterFill");
const signalList = document.querySelector("#signalList");
const signalCount = document.querySelector("#signalCount");
const linkList = document.querySelector("#linkList");
const linkCount = document.querySelector("#linkCount");
const breakdownBars = document.querySelector("#breakdownBars");
const confidenceText = document.querySelector("#confidenceText");
const aiStatusText = document.querySelector("#aiStatusText");
const aiExplanation = document.querySelector("#aiExplanation");

function getModelStatusText() {
  const config = window.FraudAiHelper.getAiConfig();
  return config.apiKey ? "Gemini server configured" : "Rule based only";
}

function setAnalyzingState(isAnalyzing) {
  analyzeButton.disabled = isAnalyzing;
  input.disabled = isAnalyzing;
  analyzeButton.classList.toggle("is-loading", isAnalyzing);
  scoreRing.classList.toggle("is-scanning", isAnalyzing);
  analyzeIcon.textContent = isAnalyzing ? "" : ">";
  analyzeButtonText.textContent = isAnalyzing ? "Analyzing" : "Analyze";
  modelStatusText.textContent = isAnalyzing ? "Analyzing content" : getModelStatusText();
  if (isAnalyzing) {
    aiStatusText.textContent = "Thinking";
  }
}

function renderSignals(signals) {
  signalList.innerHTML = "";
  signalCount.textContent = `${signals.length} found`;

  if (!signals.length) {
    signalList.innerHTML = `<li class="empty-state">No risk signals found.</li>`;
    return;
  }

  signals.forEach((signal) => {
    const item = document.createElement("li");
    item.className = `risk-${signal.level}`;
    item.innerHTML = `
      <div class="signal-title">${signal.title}<span>+${signal.weight}</span></div>
      <p>${signal.detail}</p>
    `;
    signalList.appendChild(item);
  });
}

function renderLinks(urls) {
  linkList.innerHTML = "";
  linkCount.textContent = `${urls.length} ${urls.length === 1 ? "link" : "links"}`;

  if (!urls.length) {
    linkList.innerHTML = `<li class="empty-state">No links detected.</li>`;
    return;
  }

  urls.forEach((url) => {
    const { host, tld } = window.FraudScoringEngine.getDomainParts(url.hostname);
    const item = document.createElement("li");
    item.innerHTML = `
      <div class="signal-title">${host}<span>.${tld || "unknown"}</span></div>
      <p>${url.protocol.replace(":", "").toUpperCase()} - ${url.pathname === "/" ? "root path" : url.pathname}</p>
    `;
    linkList.appendChild(item);
  });
}

function renderBreakdown(breakdown, score) {
  breakdownBars.innerHTML = "";

  Object.entries(breakdown).forEach(([name, value]) => {
    const percent = Math.min(100, value);
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <div class="bar-meta"><span>${name}</span><strong>${value}</strong></div>
      <div class="bar-track"><span style="width: ${percent}%;"></span></div>
    `;
    breakdownBars.appendChild(row);
  });

  confidenceText.textContent = score >= 70 ? "High confidence" : score >= 35 ? "Review needed" : "Low risk";
}

function renderResult(result) {
  const verdict = result.verdict;
  const degrees = result.score * 3.6;

  scoreValue.textContent = result.score;
  verdictText.textContent = verdict.label;
  verdictSummary.textContent = verdict.summary;
  meterFill.style.width = `${result.score}%`;
  meterFill.style.backgroundColor = verdict.color;
  scoreRing.style.setProperty("--score-color", verdict.color);
  scoreRing.style.background = `radial-gradient(circle, #fff 0 58%, transparent 59%), conic-gradient(${verdict.color} 0deg, ${verdict.color} ${degrees}deg, #ece7dd ${degrees}deg 360deg)`;

  renderSignals(result.signals);
  renderLinks(result.urls);
  renderBreakdown(result.breakdown, result.score);
}

function resetResult() {
  const result = window.FraudScoringEngine.analyzeContent("");
  renderResult(result);
  aiExplanation.textContent = "Run an analysis to generate a short reason and safety advice.";
  aiStatusText.textContent = "Ready";
}

async function runDetection(content) {
  setAnalyzingState(true);
  aiExplanation.innerHTML = `<span class="loading-line"></span><span class="loading-line short"></span>`;

  try {
    await new Promise((resolve) => setTimeout(resolve, 700));
    const result = window.FraudScoringEngine.analyzeContent(content);
    renderResult(result);

    const explanation = await window.FraudAiHelper.requestAiExplanation(content, result);
    const tokenLimitNote = explanation.finishReason === "MAX_TOKENS"
      ? "\n\nNote: Gemini stopped because it reached the output token limit."
      : "";
    aiExplanation.textContent = explanation.available
      ? `${explanation.text}${tokenLimitNote}`
      : `AI unavailable, running rule based detection. ${explanation.text}`;
    aiStatusText.textContent = explanation.available ? "AI generated" : "AI unavailable";
  } catch (error) {
    const fallbackResult = window.FraudScoringEngine.analyzeContent(content);
    const reason = error?.message ? ` Reason: ${error.message}` : "";
    aiExplanation.textContent = `AI unavailable, running rule based detection.${reason} ${window.FraudAiHelper.createLocalExplanation(content, fallbackResult)}`;
    aiStatusText.textContent = "AI unavailable";
    console.error(error);
  } finally {
    setAnalyzingState(false);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  runDetection(input.value);
});

clearButton.addEventListener("click", () => {
  input.value = "";
  resetResult();
  input.focus();
});

modelStatusText.textContent = getModelStatusText();
resetResult();
