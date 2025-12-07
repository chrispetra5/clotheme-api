import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MAIN MATCH ENDPOINT
app.post("/api/match", async (req, res) => {
  try {
    const userMessage = req.body.userMessage || "";

    console.log("🟢 Received /api/match request:", userMessage);

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a fashion matching engine." },
        { role: "user", content: userMessage }
      ]
    });

    return res.json({
      success: true,
      data: {
        pieces: [
          { name: "sweater", keywords: ["pink", "sweater", "knit"] }
        ],
        character: "User",
        vibe: "personalized style"
      },
      raw: aiResponse.data
    });

  } catch (err) {
    console.error("❌ /api/match error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// TEST ENDPOINT
app.get("/api/test", (req, res) => {
  res.send("API working");
});

// START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT}`)
);
