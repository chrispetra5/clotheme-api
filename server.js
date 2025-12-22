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
// PRODUCTS UPLOAD ENDPOINT
// Step 3.1 (already correct, now stores data)
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
// MATCH ENDPOINT
// Step 3.2 (THIS IS THE NEW PART)
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
      visibleCount: PRODUCT_STORE.visible.length,
      fullCount: PRODUCT_STORE.full.length
    });

    // OPTIONAL AI CALL (not used for matching yet — safe)
    await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a fashion matching engine." },
        { role: "user", content: userMessage }
      ]
    });

    // --------------------
    // CORE MATCHING LOGIC (Simple + Deterministic)
    // --------------------

    const colorFilter = context?.colors?.[0] || null;
    const categoryFilter = context?.categories?.[0] || null;

    // 1️⃣ Precision: match visible products first
    let matches = PRODUCT_STORE.visible.filter(p => {
      if (colorFilter && p.color !== colorFilter) return false;
      if (
        categoryFilter &&
        !p.title.toLowerCase().includes(categoryFilter)
      )
        return false;
      return true;
    });

    // 2️⃣ Recall: if too few results, expand to full set
    if (matches.length < 6) {
      const fallback = PRODUCT_STORE.full.filter(p => {
        if (colorFilter && p.color !== colorFilter) return false;
        return true;
      });

      matches = [...matches, ...fallback];
    }

    // 3️⃣ De-duplicate + limit
    const unique = Array.from(
      new Map(matches.map(p => [p.image, p])).values()
    ).slice(0, 24);

    console.log("🟢 /api/match results:", unique.length);

    // IMPORTANT: frontend expects { success: true, results: [] }
    return res.json({
      success: true,
      results: unique
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

