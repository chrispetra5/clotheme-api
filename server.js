// ===============================
// Clotheme.ai Backend — Stable v3.3 (Render)
// ===============================

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ===============================
// In‑memory store (OK for now)
// ===============================
let PRODUCT_STORE = {
  visible: [],
  full: []
};

// ===============================
// Health
// ===============================
app.get("/api/test", (req, res) => {
  res.json({ success: true, message: "API working" });
});

// ===============================
// STEP 3.1 — PRODUCT UPLOAD
// ===============================
app.post("/api/products/upload", (req, res) => {
  try {
    const { products } = req.body;
    if (!products) {
      return res.status(400).json({ success: false, error: "No products" });
    }

    PRODUCT_STORE.visible = Array.isArray(products.visible)
      ? products.visible
      : [];

    PRODUCT_STORE.full = Array.isArray(products.full)
      ? products.full
      : [];

    console.log("🟢 UPLOAD:", {
      visible: PRODUCT_STORE.visible.length,
      full: PRODUCT_STORE.full.length
    });

    res.json({
      success: true,
      received: {
        visible: PRODUCT_STORE.visible.length,
        full: PRODUCT_STORE.full.length
      }
    });
  } catch (e) {
    console.error("UPLOAD ERROR:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ===============================
// STEP 3.2 + 3.3 — MATCHING
// ===============================
app.post("/api/match", (req, res) => {
  try {
    const { userMessage, context = {} } = req.body;
    if (!userMessage) {
      return res.status(400).json({ success: false, error: "Missing message" });
    }

    const color = context.colors?.[0] || null;
    const category = context.categories?.[0] || null;
    const keywords = context.keywords || [];

    console.log("🟢 MATCH:", {
      userMessage,
      color,
      category,
      visible: PRODUCT_STORE.visible.length,
      full: PRODUCT_STORE.full.length
    });

    // --------------------
    // SCORING LOGIC (FIXED)
    // --------------------
    function scoreProduct(p) {
      let score = 0;

      if (color && p.color === color) score += 5;

      // SOFT category match (important for characters)
      if (
        category &&
        p.title?.toLowerCase().includes(category.toLowerCase())
      ) {
        score += 2;
      }

      for (const k of keywords) {
        if (p.title?.toLowerCase().includes(k.toLowerCase())) {
          score += 1;
        }
      }

      return score;
    }

    // 1️⃣ Precision: visible products
    let scored = PRODUCT_STORE.visible
      .map(p => ({ ...p, _score: scoreProduct(p) }))
      .filter(p => p._score > 0);

    // 2️⃣ Recall: fallback to full catalog
    if (scored.length < 6) {
      const fallback = PRODUCT_STORE.full
        .map(p => ({ ...p, _score: scoreProduct(p) }))
        .filter(p => p._score > 0);

      scored = [...scored, ...fallback];
    }

    // 3️⃣ Sort + dedupe + sanitize
    const results = Array.from(
      new Map(
        scored
          .sort((a, b) => b._score - a._score)
          .filter(p => p.image && p.title)
          .map(p => [
            p.image.startsWith("http")
              ? p.image
              : `https://image.hm.com/${p.image}`,
            {
              title: p.title,
              color: p.color || "",
              image: p.image.startsWith("http")
                ? p.image
                : `https://image.hm.com/${p.image}`,
              link: p.link || "#"
            }
          ])
      ).values()
    ).slice(0, 24);

    console.log("🟢 MATCH RESULTS:", results.length);

    res.json({ success: true, results });
  } catch (e) {
    console.error("MATCH ERROR:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ===============================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on ${PORT}`);
});
