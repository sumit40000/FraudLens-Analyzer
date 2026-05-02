(function () {
  const rules = [
    {
      category: "Urgency",
      weight: 18,
      level: "medium",
      pattern: /\b(urgent|immediately|act now|limited time|expires today|within 24 hours|final warning|last chance)\b/i,
      title: "Pressure language",
      detail: "The content pushes for fast action before the user can verify it."
    },
    {
      category: "Financial",
      weight: 22,
      level: "high",
      pattern: /\b(upi|bank account|wallet|crypto|bitcoin|gift card|wire transfer|refund fee|processing fee|security deposit|otp|one time password|cvv|pin)\b/i,
      title: "Money or credential request",
      detail: "It asks for payment details, banking actions, tokens, or secrets."
    },
    {
      category: "Identity",
      weight: 16,
      level: "medium",
      pattern: /\b(kyc|account suspended|verify your account|blocked account|income tax|customs|police|courier|delivery failed|job offer|lottery|prize|winner)\b/i,
      title: "Impersonation theme",
      detail: "The message uses a common authority, delivery, job, or prize pretext."
    },
    {
      category: "Reward",
      weight: 14,
      level: "medium",
      pattern: /\b(congratulations|free money|cashback|bonus|reward|claim now|selected|guaranteed return)\b/i,
      title: "Too-good-to-be-true offer",
      detail: "Unexpected rewards and guaranteed benefits are common fraud hooks."
    },
    {
      category: "Secrecy",
      weight: 12,
      level: "medium",
      pattern: /\b(do not share|keep confidential|don't tell|secret code|private offer)\b/i,
      title: "Secrecy cue",
      detail: "The sender discourages normal verification or outside advice."
    },
    {
      category: "Financial",
      weight: 40,
      level: "high",
      pattern: /\b(otp|one time password|verification code|security code)\b[\s\S]{0,120}\b(call|executive|agent|representative|confirm your identity|verify your identity)\b|\b(call|executive|agent|representative|confirm your identity|verify your identity)\b[\s\S]{0,120}\b(otp|one time password|verification code|security code)\b/i,
      title: "OTP callback request",
      detail: "The message combines an OTP or verification code with a call or identity confirmation request."
    },
    {
      category: "Formatting",
      weight: 8,
      level: "low",
      pattern: /[A-Z]{8,}|!{2,}|\?{2,}/,
      title: "Aggressive formatting",
      detail: "Excessive capitals or punctuation can indicate manipulative messaging."
    }
  ];

  const trustedDomains = [
    "google.com",
    "microsoft.com",
    "apple.com",
    "amazon.com",
    "paypal.com",
    "sbi.co.in",
    "hdfcbank.com",
    "icicibank.com",
    "axisbank.com",
    "gov.in",
    "nic.in"
  ];

  const suspiciousTlds = ["zip", "mov", "tk", "ml", "ga", "cf", "gq", "top", "xyz", "click", "work", "rest"];

  function extractUrls(text) {
    const matches = text.match(/\bhttps?:\/\/[^\s<>"']+|\bwww\.[^\s<>"']+/gi) || [];
    return matches.map((url) => {
      const normalized = url.startsWith("www.") ? `https://${url}` : url;
      try {
        return new URL(normalized);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }

  function getDomainParts(hostname) {
    const host = hostname.toLowerCase().replace(/^www\./, "");
    const parts = host.split(".");
    return {
      host,
      tld: parts.at(-1) || "",
      root: parts.slice(-2).join(".")
    };
  }

  function getVerdict(score) {
    if (score >= 70) {
      return {
        label: "Fraud",
        color: "#bc3131",
        summary: "High-risk indicators are present. Treat this content as unsafe until verified through an official channel."
      };
    }

    if (score >= 35) {
      return {
        label: "Suspicious",
        color: "#b36b00",
        summary: "Some risk indicators are present. Verify the sender, destination link, and requested action."
      };
    }

    return {
      label: "Normal",
      color: "#257a4a",
      summary: score === 0 ? "No obvious fraud indicators detected." : "Low risk based on the current rule set."
    };
  }

  function scoreUrl(url) {
    const { host, tld, root } = getDomainParts(url.hostname);
    const signals = [];
    let score = 0;

    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      score += 16;
      signals.push({ title: "IP address link", detail: "Fraud links often hide the destination behind a raw IP address.", level: "high", category: "Link", weight: 16 });
    }

    if (url.protocol !== "https:") {
      score += 12;
      signals.push({ title: "Non-secure link", detail: "The link does not use HTTPS.", level: "medium", category: "Link", weight: 12 });
    }

    if (suspiciousTlds.includes(tld)) {
      score += 13;
      signals.push({ title: "Risky top-level domain", detail: `The .${tld} domain is frequently seen in disposable campaigns.`, level: "medium", category: "Link", weight: 13 });
    }

    if (host.includes("-") && /(bank|verify|login|secure|account|pay|kyc|support)/i.test(host)) {
      score += 14;
      signals.push({ title: "Brand-like link pattern", detail: "The domain combines security words with hyphens, a common spoofing style.", level: "high", category: "Link", weight: 14 });
    }

    if (trustedDomains.some((domain) => host.includes(domain) && root !== domain)) {
      score += 18;
      signals.push({ title: "Possible brand spoofing", detail: "A trusted brand appears inside a different domain.", level: "high", category: "Link", weight: 18 });
    }

    if (url.search.length > 80) {
      score += 8;
      signals.push({ title: "Long tracking query", detail: "The URL contains a long query string.", level: "low", category: "Link", weight: 8 });
    }

    return { score, signals };
  }

  function analyzeContent(text) {
    const cleanText = text.trim();
    const urls = extractUrls(cleanText);
    const matchedSignals = [];
    const breakdown = {
      Language: 0,
      Financial: 0,
      Identity: 0,
      Link: 0,
      Formatting: 0
    };

    rules.forEach((rule) => {
      if (rule.pattern.test(cleanText)) {
        matchedSignals.push(rule);
        if (rule.category === "Financial") breakdown.Financial += rule.weight;
        else if (rule.category === "Identity" || rule.category === "Reward" || rule.category === "Secrecy") breakdown.Identity += rule.weight;
        else if (rule.category === "Formatting") breakdown.Formatting += rule.weight;
        else breakdown.Language += rule.weight;
      }
    });

    urls.forEach((url) => {
      const urlResult = scoreUrl(url);
      matchedSignals.push(...urlResult.signals);
      breakdown.Link += urlResult.score;
    });

    if (urls.length > 1) {
      const extraWeight = Math.min(12, (urls.length - 1) * 6);
      matchedSignals.push({
        title: "Multiple links",
        detail: "Several links in one message increase uncertainty.",
        level: "medium",
        category: "Link",
        weight: extraWeight
      });
      breakdown.Link += extraWeight;
    }

    if (cleanText.length < 35 && urls.length > 0) {
      matchedSignals.push({
        title: "Sparse message with link",
        detail: "Very short link-only messages give little trustworthy context.",
        level: "medium",
        category: "Link",
        weight: 10
      });
      breakdown.Link += 10;
    }

    const rawScore = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
    const score = Math.max(0, Math.min(100, rawScore));
    return { score, verdict: getVerdict(score), signals: matchedSignals, urls, breakdown };
  }

  window.FraudScoringEngine = {
    analyzeContent,
    extractUrls,
    getDomainParts,
    getVerdict
  };
})();
