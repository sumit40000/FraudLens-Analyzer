const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon"
};

function loadEnv() {
  const envPath = path.join(ROOT, ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      return;
    }

    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");

    process.env[key] = value;
  });
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  response.end(JSON.stringify(data));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 100000) {
        request.destroy();
        reject(new Error("Request body too large."));
      }
    });

    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function handleGeminiRequest(request, response) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey || apiKey === "PASTE_YOUR_GEMINI_API_KEY_HERE") {
    sendJson(response, 503, { error: "Gemini API key is not configured." });
    return;
  }

  const body = await readRequestBody(request);
  let payload;

  try {
    payload = JSON.parse(body || "{}");
  } catch {
    sendJson(response, 400, { error: "Invalid JSON body." });
    return;
  }

  if (!payload.prompt) {
    sendJson(response, 400, { error: "Missing prompt." });
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
    sendJson(response, geminiResponse.status, {
      error: data.error?.message || "Gemini request failed."
    });
    return;
  }

  sendJson(response, 200, {
    finishReason: data.candidates?.[0]?.finishReason || null,
    text: data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ""
  });
}

function handleHealthRequest(response) {
  sendJson(response, 200, {
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "PASTE_YOUR_GEMINI_API_KEY_HERE"),
    geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash"
  });
}

function serveStatic(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const decodedPath = decodeURIComponent(requestUrl.pathname);
  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.replace(/^[/\\]+/, "");
  const filePath = path.resolve(ROOT, relativePath);

  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500);
      response.end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream"
    });
    response.end(content);
  });
}

loadEnv();

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`);
    const pathname = requestUrl.pathname.replace(/\/$/, "") || "/";

    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      });
      response.end();
      return;
    }

    if (request.method === "GET" && pathname === "/api/health") {
      handleHealthRequest(response);
      return;
    }

    if (request.method === "POST" && pathname === "/api/gemini") {
      await handleGeminiRequest(request, response);
      return;
    }

    if (request.method === "GET") {
      serveStatic(request, response);
      return;
    }

    response.writeHead(405);
    response.end("Method not allowed");
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Server error." });
  }
});

server.listen(PORT, () => {
  console.log(`FraudLens running at http://localhost:${PORT}`);
});
