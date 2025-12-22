// --------------------
// In-memory store (reset on deploy — OK for now)
// --------------------
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
// OpenAI Client (optional, not used for scoring)
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
// PRODUCTS UPLOAD (Step 3.1)
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

    PRODUCT_STORE.visible = Array.isArray(products.visible)
      ? products.visible
      : [];

    PRODUCT_STORE.full = Array.isArray(products.full)
      ? products.full
      : [];

    console.log("🟢 /api/products/upload stored:", {
      visible: PRODUCT_STORE.visible.length,
      full: PRODUCT_STORE.full.length
    });

    return res.json({
      success: true,
      received: {
        visible: PRODUCT_STORE.visible.length,
        full: PRODUCT_STORE.full.length
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
// MATCH ENDPOINT (Step 3.2 + 3.3)
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
      context,
      visible: PRODUCT_STORE.visible.length,
      full: PRODUCT_STORE.full.length
    });

    const color = context?.colors?.[0] || null;
    const category = context?.categories?.[0] || null;
    const keywords = context?.keywords || [];

    // --------------------
    // STEP 3.3 — SCORING FUNCTION
    // --------------------
    function scoreProduct(p) {
      let score = 0;

      if (color && p.color === color) score += 4;

      if (
        category &&
        p.title.toLowerCase().includes(category.toLowerCase())
      ) {
        score += 3;
      }

      for (const k of keywords) {
        if (p.title.toLowerCase().includes(k.toLowerCase())) {
          score += 1;
        }
      }

      return score;
    }

    // 1️⃣ Score visible products (precision)
    let scored = PRODUCT_STORE.visible
      .map(p => ({ ...p, _score: scoreProduct(p) }))
      .filter(p => p._score > 0);

    // 2️⃣ Fallback to full set (recall)
    if (scored.length < 8) {
      const fallback = PRODUCT_STORE.full
        .map(p => ({ ...p, _score: scoreProduct(p) }))
        .filter(p => p._score > 0);

      scored = [...scored, ...fallback];
    }

    // 3️⃣ Sort, dedupe, limit
    const results = Array.from(
      new Map(
        scored
          .sort((a, b) => b._score - a._score)
          .map(p => [p.image, p])
      ).values()
    )
      .slice(0, 24)
      .map(({ _score, ...p }) => p);

    console.log("🟢 /api/match results:", results.length);

    return res.json({
      success: true,
      results
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
// Start Server
// --------------------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
