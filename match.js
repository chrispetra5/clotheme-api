import express from "express";
import OpenAI from "openai";

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
You are Clotheme.ai — an AI stylist.
Respond ONLY in this exact JSON format:

{
  "character": "...",
  "pieces": [
    { "name": "...", "keywords": ["...", "..."] }
  ],
  "vibe": "..."
}

Rules:
- NO prices
- NO brand names
- NO retailer names
- NO markdown
- Output ONLY JSON, no extra text
`;

router.post("/", async (req, res) => {
  try {
    const userMessage = req.body.userMessage || "";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ]
    });

    let text = completion.choices[0]?.message?.content || "";

    // -------------------------------
    // AI JSON REPAIR LAYER (critical)
    // -------------------------------
    function extractJSON(str) {
      try {
        return JSON.parse(str);
      } catch (_) {}

      const match = str.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (_) {}
      }
      return null;
    }

    const parsed = extractJSON(text);

    if (!parsed || !parsed.pieces) {
      return res.json({
        success: false,
        error: "Invalid JSON from AI"
      });
    }

    return res.json({ success: true, data: parsed });

  } catch (err) {
    console.error("AI error:", err);
    return res.json({ success: false, error: "Backend failure" });
  }
});

export default router;
