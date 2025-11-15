// server.js
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();

// allow extension & local files to call your API
app.use(cors());

// parse JSON
app.use(express.json());

// secure: OpenAI key from Render environment
const OPENAI_KEY = process.env.OPENAI_KEY;

if (!OPENAI_KEY) {
  console.error("❌ ERROR: OPENAI_KEY is missing from environment.");
  process.exit(1);
}

// health check (Render requires this)
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// proxy endpoint
app.post('/api/match', async (req, res) => {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// server start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Clotheme API running on port", PORT);
});
