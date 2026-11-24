
import express from "express";

import {
  upload,
  createAnalysis,
  getAnalyses,
  getAnalysisById,
  deleteAnalysis
} from "../controllers/analysisController.js";

const router = express.Router();

// Upload video, process it through AI and save its results
router.post("/", upload, createAnalysis);

// Get saved analysis history
router.get("/", getAnalyses);

// Get one saved analysis
router.get("/:id", getAnalysisById);

// Delete one analysis record
router.delete("/:id", deleteAnalysis);

export default router;
