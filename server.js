// In-memory store (reset on deploy — OK for now)
let PRODUCT_STORE = {
  visible: [],
  full: []
};
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// --------------------
// Middleware
// --------------------
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// --------------------
// OpenAI Client
// --------------------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// --------------------
// Health Check
// --------------------
app.get("/api/test", (req, res) => {
  res.json({ success: true, message: "API working" });
});

// --------------------
// MATCH ENDPOINT
// Called by: POST /api/match
// --------------------
app.post("/api/match", async (req, res) => {
  try {
    const { userMessage, context } = req.body;

    if (!userMessage) {
      return res.status(400).json({
        success: false,
        error: "userMessage is required"
      });
    }

    console.log("🟢 /api/match:", {
      userMessage,
      context
    });

    // OPTIONAL: AI call (safe + minimal)
    await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a fashion matching engine." },
        { role: "user", content: userMessage }
      ]
    });

    // IMPORTANT:
    // Your frontend expects { success: true, results: [] }
    return res.json({
      success: true,
      results: [] // backend matching can be added later
    });

  } catch (err) {
    console.error("❌ /api/match error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// --------------------
// PRODUCTS UPLOAD ENDPOINT
// Called by: POST /api/products/upload
// --------------------
app.post("/api/products/upload", async (req, res) => {
  try {
    const { products } = req.body;

    if (!products) {
      return res.status(400).json({
        success: false,
        error: "No products provided"
      });
    }

    const visibleCount = Array.isArray(products.visible)
      ? products.visible.length
      : 0;

    const fullCount = Array.isArray(products.full)
      ? products.full.length
      : 0;

    console.log("🟢 /api/products/upload:", {
      visible: visibleCount,
      full: fullCount
    });

    // TEMP STORAGE / LOGGING ONLY
    // (You can add DB, embeddings, etc later)

    return res.json({
      success: true,
      received: {
        visible: visibleCount,
        full: fullCount
      }
    });

  } catch (err) {
    console.error("❌ /api/products/upload error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// --------------------
// Start Server
// --------------------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
