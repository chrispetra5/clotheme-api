import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import matchRoutes from "./match.js";   // ✅ FIXED: correct path

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/match", matchRoutes);

app.get("/", (req, res) => {
  res.send("Clotheme API running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
