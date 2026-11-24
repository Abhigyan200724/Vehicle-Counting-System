
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import analysisRoutes from "./routes/analysisRoutes.js";
import liveSessionRoutes from "./routes/liveSessionRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    "https://lightweight-vehicle-counting-system.vercel.app",
    "https://vehicle-counting-system-1.onrender.com"
  ],
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());


// Basic backend route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Vehicle Counting System Backend Running"
  });
});


// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    backend: "online",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected"
  });
});


// Analysis routes
app.use("/api/analysis", analysisRoutes);
app.use("/api/live-sessions", liveSessionRoutes);
app.use("/api/analytics", analyticsRoutes);


// Handle upload errors and other middleware errors
app.use((error, req, res, next) => {

  console.error("Server Error:", error.message);

  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      message: "Video size must be below 200 MB"
    });
  }

  if (error.message?.includes("Only MP4")) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
});


const PORT = process.env.PORT || 5000;

async function startServer() {

  try {

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in backend/.env");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB Connected Successfully");

    app.listen(PORT, () => {
      console.log(`Backend running at http://localhost:${PORT}`);
    });

  } catch (error) {

    console.error("Backend startup failed:", error.message);
    process.exit(1);

  }
}

startServer();
