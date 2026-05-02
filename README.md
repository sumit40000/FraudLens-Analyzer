# FraudLens Analyzer

FraudLens Analyzer is a hackathon project that checks pasted messages, links, emails, or SMS content and gives a fraud risk score from `0` to `100`.

Based on the score, it classifies the content as:

- `Normal`
- `Suspicious`
- `Fraud`

The app uses a rule-based scoring engine for fast detection and Gemini AI for a user-friendly explanation. If Gemini is unavailable, the app automatically falls back to rule-based explanation.

## Features

- Paste any message, SMS, email, or link for analysis
- Fraud risk score from `0` to `100`
- Verdict: `Normal`, `Suspicious`, or `Fraud`
- Risk signals and score breakdown
- Link extraction and URL risk checks
- Gemini AI explanation through a local Node.js backend
- Safe `.env` setup so the API key is not exposed in frontend code

## Tech Stack

- HTML
- CSS
- JavaScript
- Node.js local server
- Gemini API

## Project Structure

```text
FraudLens-Analyzer/
├── api/
│   └── gemini.js
├── utils/
│   ├── aiHelper.js
│   ├── geminiClient.js
│   └── scoringEngine.js
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── script.js
├── server.js
└── styles.css
└── vercel.json
```

## Clone And Run Locally

1. Clone the repository:

```bash
git clone https://github.com/sumit40000/FraudLens-Analyzer.git
```

2. Go inside the project folder:

```bash
cd FraudLens-Analyzer
```

3. Create a `.env` file from the example:

```bash
copy .env.example .env
```

On macOS/Linux, use:

```bash
cp .env.example .env
```

4. Open `.env` and paste your Gemini API key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

5. Start the local server:

```bash
npm start
```

6. Open the app in your browser:

```text
http://localhost:3000
```

## API Health Check

To verify that the backend loaded your `.env` file correctly, open:

```text
http://localhost:3000/api/health
```

Expected response:

```json
{
  "geminiKeyConfigured": true,
  "geminiModel": "gemini-2.5-flash"
}
```

## Important Notes

- Do not commit your `.env` file.
- `.env` is already listed in `.gitignore`.
- If the AI explanation fails, the app will still run rule-based detection.
- After changing `.env`, restart the server with `Ctrl + C` and then `npm start`.

## Deploy On Vercel

1. Push the latest code to GitHub.

2. Import the repository in Vercel:

```text
https://github.com/sumit40000/FraudLens-Analyzer
```

3. Add these environment variables in Vercel project settings:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

4. Deploy the project.

Vercel will serve the frontend files and use `api/gemini.js` as the serverless Gemini API endpoint.

After deploy, test these URLs:

```text
https://your-vercel-url.vercel.app/
https://your-vercel-url.vercel.app/api/health
```

Open `/api/gemini` directly in the browser will not work because it only accepts `POST` requests from the app.

## Common Issues

### AI unavailable

Make sure:

- The server is running with `npm start`
- You are opening `http://localhost:3000`
- Your `.env` file has a valid Gemini API key
- Your Gemini project has quota available

### Model error

Check that your `.env` contains:

```env
GEMINI_MODEL=gemini-2.5-flash
```

### Changes not showing

Hard refresh the browser:

```text
Ctrl + Shift + R
```

## License

This project is created for hackathon and educational use.
