
import mongoose from "mongoose";

const analysisSchema = new mongoose.Schema(
  {
    originalFileName: {
      type: String,
      required: true
    },

    fileSize: {
      type: Number,
      required: true
    },

    framesProcessed: {
      type: Number,
      default: 0
    },

    totalFrames: {
      type: Number,
      default: 0
    },

    totalTracksObserved: {
      type: Number,
      default: 0
    },

    totalUniqueVehicles: {
      type: Number,
      default: 0
    },

    vehiclesByClass: {
      type: Map,
      of: Number,
      default: {}
    },

    directionCounts: {
      up: {
        type: Number,
        default: 0
      },
      down: {
        type: Number,
        default: 0
      }
    },

    averageVisibleVehicles: {
      type: Number,
      default: 0
    },

    peakVisibleVehicles: {
      type: Number,
      default: 0
    },

    trafficDensity: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Low"
    },

    videoFps: {
      type: Number,
      default: 0
    },

    resolution: {
      type: String,
      default: ""
    },

    videoUrl: {
      type: String,
      required: true
    },

    countingLinePosition: {
      type: Number,
      default: 0.6
    }
  },
  {
    timestamps: true
  }
);

const Analysis = mongoose.model("Analysis", analysisSchema);

export default Analysis;
