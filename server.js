// ===============================
// Clotheme.ai Backend — Stable v3.4 (Render)
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
// Helpers
// ===============================
function normalizeColor(c = "") {
  const s = String(c).toLowerCase();
  if (!s) return "";
  if (s.includes("pink") || s.includes("rose") || s.includes("blush")) return "pink";
  if (s.includes("black")) return "black";
  if (s.includes("white") || s.includes("off-white") || s.includes("off white")) return "white";
  return s.trim();
}

function normalizeImage(img) {
  if (!img) return null;
  const s = String(img);
  if (s.startsWith("http")) return s;

  // If you ever send relative H&M paths, this prevents broken images
  // (safe no-op for normal full URLs)
  return `https://image.hm.com/${s.replace(/^\/+/, "")}`;
}

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

    PRODUCT_STORE.visible = Array.isArray(products.visible) ? products.visible : [];
    PRODUCT_STORE.full = Array.isArray(products.full) ? products.full : [];

    // normalize a bit so matching is stable
    PRODUCT_STORE.visible = PRODUCT_STORE.visible.map(p => ({
      ...p,
      color: normalizeColor(p.color),
      image: normalizeImage(p.image)
    }));

    PRODUCT_STORE.full = PRODUCT_STORE.full.map(p => ({
      ...p,
      color: normalizeColor(p.color),
      image: normalizeImage(p.image)
    }));

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

    const color = context.colors?.[0] ? normalizeColor(context.colors[0]) : null;
    const category = context.categories?.[0] || null;
    const keywords = Array.isArray(context.keywords) ? context.keywords : [];

    // Character queries: "Eleven from Stranger Things"
    const isCharacterQuery = String(userMessage).toLowerCase().includes(" from ");

    console.log("🟢 MATCH:", {
      userMessage,
      color,
      category,
      isCharacterQuery,
      visible: PRODUCT_STORE.visible.length,
      full: PRODUCT_STORE.full.length
    });

    function scoreProduct(p) {
      let score = 0;

      const title = (p.title || "").toLowerCase();

      // Strong color preference
      if (color && p.color === color) score += 5;

      // IMPORTANT: only apply category for NON-character queries
      if (!isCharacterQuery && category && title.includes(String(category).toLowerCase())) {
        score += 2;
      }

      // Keywords: small boosts
      for (const k of keywords) {
        if (k && title.includes(String(k).toLowerCase())) score += 1;
      }

      return score;
    }

    // 1) precision: visible set first
    let scored = PRODUCT_STORE.visible
      .map(p => ({ ...p, _score: scoreProduct(p) }))
      .filter(p => p._score > 0);

    // 2) fallback: full set
    if (scored.length < 6) {
      const fallback = PRODUCT_STORE.full
        .map(p => ({ ...p, _score: scoreProduct(p) }))
        .filter(p => p._score > 0);

      scored = [...scored, ...fallback];
    }

    // 3) sort + dedupe + sanitize
    const results = Array.from(
      new Map(
        scored
          .sort((a, b) => b._score - a._score)
          .filter(p => p && p.image && p.title)
          .map(p => [
            p.image, // key by image
            {
              title: p.title,
              color: p.color || "",
              image: p.image,
              link: p.link && String(p.link).startsWith("http") ? p.link : "#"
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on ${PORT}`);
});

