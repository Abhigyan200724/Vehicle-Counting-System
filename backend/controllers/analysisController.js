
import axios from "axios";
import FormData from "form-data";
import multer from "multer";

import Analysis from "../models/Analysis.js";

const AI_SERVICE_URL = (
  process.env.AI_SERVICE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

const MAX_FILE_SIZE = 200 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  ".mp4",
  ".avi",
  ".mov",
  ".mkv"
];

// Store uploaded file temporarily in memory.
// The file is forwarded to the AI service and not saved
// permanently on the Node.js server.
export const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE
  },

  fileFilter: (req, file, callback) => {
    const extension = (
      file.originalname.match(/\.[^.]+$/)?.[0] || ""
    ).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return callback(
        new Error("Only MP4, AVI, MOV and MKV videos are supported")
      );
    }

    callback(null, true);
  }
}).single("file");


export async function createAnalysis(req, res) {

  try {

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a video file"
      });
    }

    // Forward video to Python AI service
    const formData = new FormData();

    formData.append(
      "file",
      req.file.buffer,
      {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      }
    );

    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/api/detection/video`,
      formData,
      {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 0
      }
    );

    const aiData = aiResponse.data;

    if (!aiData.success || !aiData.statistics || !aiData.video_url) {
      return res.status(502).json({
        success: false,
        message: "AI service returned an incomplete response"
      });
    }

    const stats = aiData.statistics;

    // Save analysis in MongoDB
    const analysis = await Analysis.create({

      originalFileName: req.file.originalname,

      fileSize: req.file.size,

      framesProcessed: stats.frames_processed,

      totalFrames: stats.total_frames,

      totalTracksObserved: stats.total_tracks_observed,

      totalUniqueVehicles: stats.total_unique_vehicles,

      vehiclesByClass: stats.vehicles_by_class || {},

      directionCounts: stats.direction_counts || {
        up: 0,
        down: 0
      },

      averageVisibleVehicles: stats.average_visible_vehicles,

      peakVisibleVehicles: stats.peak_visible_vehicles,

      trafficDensity: stats.traffic_density,

      videoFps: stats.video_fps,

      resolution: stats.resolution,

      videoUrl: aiData.video_url,

      countingLinePosition: stats.counting_line_position
    });

    return res.status(201).json({
      success: true,
      message: "Video analyzed and saved successfully",

      analysis: {
        ...analysis.toObject(),
        vehiclesByClass: Object.fromEntries(
          analysis.vehiclesByClass
        )
      }
    });

  } catch (error) {

    console.error(
      "Analysis Error:",
      error.response?.data || error.message
    );

    if (error.response) {
      return res.status(502).json({
        success: false,
        message: "AI service failed to process the video",
        detail: error.response.data?.detail || error.response.data?.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to complete video analysis"
    });
  }
}


// Get all saved analyses
export async function getAnalyses(req, res) {

  try {

    const analyses = await Analysis.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      total: analyses.length,
      analyses
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Unable to fetch analysis history"
    });
  }
}


// Get one analysis by ID
export async function getAnalysisById(req, res) {

  try {

    const analysis = await Analysis.findById(req.params.id).lean();

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: "Analysis not found"
      });
    }

    res.json({
      success: true,
      analysis
    });

  } catch (error) {

    res.status(400).json({
      success: false,
      message: "Invalid analysis ID"
    });
  }
}


// Delete one saved analysis record
export async function deleteAnalysis(req, res) {

  try {

    const analysis = await Analysis.findByIdAndDelete(req.params.id);

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: "Analysis not found"
      });
    }

    res.json({
      success: true,
      message: "Analysis record deleted successfully"
    });

  } catch (error) {

    res.status(400).json({
      success: false,
      message: "Unable to delete analysis"
    });
  }
}
