
import mongoose from "mongoose";

const liveSessionSchema = new mongoose.Schema(
  {
    startedAt: {
      type: Date,
      required: true
    },
    endedAt: {
      type: Date,
      required: true
    },
    durationSeconds: {
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
      up: { type: Number, default: 0 },
      down: { type: Number, default: 0 }
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
    framesProcessed: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

export default mongoose.model("LiveSession", liveSessionSchema);
