
import Analysis from "../models/Analysis.js";
import LiveSession from "../models/LiveSession.js";

const vehicleTypes = ["car", "motorcycle", "bus", "truck"];

function getVehicleCounts(value) {
  if (!value) return {};

  if (value instanceof Map) {
    return Object.fromEntries(value);
  }

  return value;
}

function getDateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

export const getAnalytics = async (req, res) => {
  try {
    const allowedDays = [7, 30, 90];
    const requestedDays = Number(req.query.days || 30);

    const days = allowedDays.includes(requestedDays)
      ? requestedDays
      : 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const [videoAnalyses, liveSessions] = await Promise.all([
      Analysis.find({
        createdAt: { $gte: startDate }
      }).lean(),

      LiveSession.find({
        startedAt: { $gte: startDate }
      }).lean()
    ]);

    const records = [
      ...videoAnalyses.map(item => ({
        date: item.createdAt,
        hour: new Date(item.createdAt).getHours(),
        source: "Uploaded Video",
        vehicles: Number(item.totalUniqueVehicles) || 0,
        averageVisible: Number(item.averageVisibleVehicles) || 0,
        peakVisible: Number(item.peakVisibleVehicles) || 0,
        density: item.trafficDensity || "Low",
        duration: 0,
        classes: getVehicleCounts(item.vehiclesByClass),
        directions: item.directionCounts || {}
      })),

      ...liveSessions.map(item => ({
        date: item.startedAt,
        hour: new Date(item.startedAt).getHours(),
        source: "Live Camera",
        vehicles: Number(item.totalUniqueVehicles) || 0,
        averageVisible: Number(item.averageVisibleVehicles) || 0,
        peakVisible: Number(item.peakVisibleVehicles) || 0,
        density: item.trafficDensity || "Low",
        duration: Number(item.durationSeconds) || 0,
        classes: getVehicleCounts(item.vehiclesByClass),
        directions: item.directionCounts || {}
      }))
    ];

    const totalVehicles = records.reduce(
      (sum, item) => sum + item.vehicles,
      0
    );

    const vehicleCounts = {
      car: 0,
      motorcycle: 0,
      bus: 0,
      truck: 0
    };

    const densityCounts = {
      Low: 0,
      Medium: 0,
      High: 0
    };

    const sourceCounts = {
      "Uploaded Video": 0,
      "Live Camera": 0
    };

    const dailyMap = {};
    const hourlyMap = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${String(hour).padStart(2, "0")}:00`,
      vehicles: 0,
      sessions: 0
    }));

    let totalDuration = 0;
    let totalUp = 0;
    let totalDown = 0;

    for (const record of records) {
      const key = getDateKey(record.date);

      if (!dailyMap[key]) {
        dailyMap[key] = {
          date: key,
          vehicles: 0,
          sessions: 0
        };
      }

      dailyMap[key].vehicles += record.vehicles;
      dailyMap[key].sessions += 1;

      hourlyMap[record.hour].vehicles += record.vehicles;
      hourlyMap[record.hour].sessions += 1;

      sourceCounts[record.source] += 1;
      densityCounts[record.density] =
        (densityCounts[record.density] || 0) + 1;

      for (const type of vehicleTypes) {
        vehicleCounts[type] += Number(record.classes?.[type]) || 0;
      }

      totalUp += Number(record.directions?.up) || 0;
      totalDown += Number(record.directions?.down) || 0;
      totalDuration += record.duration;
    }

    const dailyTrend = Object.values(dailyMap).sort(
      (a, b) => a.date.localeCompare(b.date)
    );

    const totalSessions = records.length;

    const averageVehiclesPerSession = totalSessions
      ? Number((totalVehicles / totalSessions).toFixed(2))
      : 0;

    const averageLiveDuration = liveSessions.length
      ? Math.round(totalDuration / liveSessions.length)
      : 0;

    const averageVisibleVehicles = totalSessions
      ? Number((
          records.reduce((sum, item) => sum + item.averageVisible, 0) /
          totalSessions
        ).toFixed(2))
      : 0;

    const peakVisibleVehicles = records.length
      ? Math.max(...records.map(item => item.peakVisible))
      : 0;

    res.json({
      success: true,
      periodDays: days,
      summary: {
        totalSessions,
        uploadedVideoSessions: videoAnalyses.length,
        liveCameraSessions: liveSessions.length,
        totalVehicles,
        averageVehiclesPerSession,
        averageVisibleVehicles,
        peakVisibleVehicles,
        averageLiveDuration,
        totalUp,
        totalDown
      },
      vehicleCounts,
      densityCounts,
      sourceCounts,
      dailyTrend,
      hourlyTrend: hourlyMap
    });

  } catch (error) {
    console.error("Analytics error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to generate analytics."
    });
  }
};
