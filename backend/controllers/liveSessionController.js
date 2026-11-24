
import LiveSession from "../models/LiveSession.js";

export const createLiveSession = async (req, res) => {
  try {
    const {
      startedAt,
      endedAt,
      durationSeconds,
      statistics
    } = req.body;

    if (!startedAt || !endedAt || !statistics) {
      return res.status(400).json({
        success: false,
        message: "Session dates and statistics are required."
      });
    }

    const session = await LiveSession.create({
      startedAt,
      endedAt,
      durationSeconds: Math.max(0, Number(durationSeconds) || 0),

      totalUniqueVehicles:
        Number(statistics.total_unique_vehicles) || 0,

      vehiclesByClass:
        statistics.vehicles_by_class || {},

      directionCounts: {
        up: Number(statistics.direction_counts?.up) || 0,
        down: Number(statistics.direction_counts?.down) || 0
      },

      averageVisibleVehicles:
        Number(statistics.average_visible_vehicles) || 0,

      peakVisibleVehicles:
        Number(statistics.peak_visible_vehicles) || 0,

      trafficDensity:
        ["Low", "Medium", "High"].includes(statistics.traffic_density)
          ? statistics.traffic_density
          : "Low",

      framesProcessed:
        Number(statistics.frames_processed) || 0
    });

    res.status(201).json({
      success: true,
      message: "Live monitoring session saved.",
      session
    });

  } catch (error) {
    console.error("Save live session error:", error);

    res.status(500).json({
      success: false,
      message: "Could not save live monitoring session."
    });
  }
};

export const getLiveSessions = async (req, res) => {
  try {
    const sessions = await LiveSession.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      count: sessions.length,
      sessions
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not fetch live session history."
    });
  }
};

export const getLiveSessionById = async (req, res) => {
  try {
    const session = await LiveSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Live session not found."
      });
    }

    res.json({ success: true, session });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Invalid session ID."
    });
  }
};

export const deleteLiveSession = async (req, res) => {
  try {
    const session = await LiveSession.findByIdAndDelete(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Live session not found."
      });
    }

    res.json({
      success: true,
      message: "Live session deleted."
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Could not delete live session."
    });
  }
};
