import AnalysisHistory from "./components/AnalysisHistory";
import LiveSessionHistory from "./components/LiveSessionHistory";
import Analytics from "./components/Analytics";
import LiveCamera from "./components/LiveCamera";
import { useMemo, useState } from "react";
import axios from "axios";

import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bike,
  BusFront,
  CarFront,
  CheckCircle2,
  Clock3,
  Gauge,
  LoaderCircle,
  Play,
  RotateCcw,
  Truck,
  Upload,
  Video
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

import "./App.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const AI_BASE_URL = (
  import.meta.env.VITE_AI_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

const MAX_FILE_SIZE = 200 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [".mp4", ".avi", ".mov", ".mkv"];

const CLASS_CONFIG = {
  car: { label: "Cars", color: "#38bdf8", icon: CarFront },
  motorcycle: { label: "Motorcycles", color: "#f59e0b", icon: Bike },
  bus: { label: "Buses", color: "#a78bfa", icon: BusFront },
  truck: { label: "Trucks", color: "#34d399", icon: Truck }
};

function StatCard({ title, value, description, icon: Icon }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span>{title}</span>
        <div className="stat-icon">
          <Icon size={20} />
        </div>
      </div>

      <h2>{value ?? 0}</h2>
      <p>{description}</p>
    </div>
  );
}

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [result, setResult] = useState(null);

  const [stage, setStage] = useState("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");

  const [dragActive, setDragActive] = useState(false);

  const statistics = result?.statistics;

  const videoUrl = result?.video_url
    ? `${AI_BASE_URL}${result.video_url}`
    : "";

  const classData = useMemo(() => {
    const counts = statistics?.vehicles_by_class || {};

    return Object.entries(CLASS_CONFIG).map(([key, config]) => ({
      name: config.label,
      key,
      count: counts[key] || 0,
      color: config.color
    }));
  }, [statistics]);

  const pieData = classData.filter(item => item.count > 0);

  function validateFile(file) {
    if (!file) {
      return "Please select a video file.";
    }

    const extension = "." + file.name.split(".").pop().toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return "Please select an MP4, AVI, MOV or MKV video.";
    }

    if (file.size > MAX_FILE_SIZE) {
      return "Video size must be below 200 MB.";
    }

    if (file.size === 0) {
      return "The selected video is empty.";
    }

    return "";
  }

  function handleFile(file) {
    const validationError = validateFile(file);

    setError("");
    setResult(null);
    setUploadProgress(0);

    if (validationError) {
      setSelectedFile(null);
      setError(validationError);
      return;
    }

    setSelectedFile(file);
    setStage("idle");
  }

  function handleInputChange(event) {
    const file = event.target.files?.[0];

    if (file) {
      handleFile(file);
    }

    // Allows choosing the same file again after reset
    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      handleFile(file);
    }
  }

  async function analyzeVideo() {
    if (!selectedFile) {
      setError("Please select a traffic video first.");
      return;
    }

    setError("");
    setResult(null);
    setUploadProgress(0);
    setStage("uploading");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await axios.post(
      `${API_BASE_URL}/api/analysis`,
        formData,
        {
          timeout: 0,

          onUploadProgress: progressEvent => {
            if (progressEvent.total) {
              const percent = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );

              setUploadProgress(percent);

              if (percent >= 100) {
                setStage("processing");
              }
            }
          }
        }
      );

   if (!response.data?.success || !response.data?.analysis) {
  throw new Error("Backend did not return saved analysis results.");
}

const savedAnalysis = response.data.analysis;

// Convert MongoDB field names into the names
// already used by the Phase 4 dashboard.
setResult({
  success: true,
  message: response.data.message,

  video_url: savedAnalysis.videoUrl,

  statistics: {
    frames_processed: savedAnalysis.framesProcessed,
    total_frames: savedAnalysis.totalFrames,

    total_tracks_observed: savedAnalysis.totalTracksObserved,

    total_unique_vehicles: savedAnalysis.totalUniqueVehicles,

    vehicles_by_class: savedAnalysis.vehiclesByClass || {},

    direction_counts: savedAnalysis.directionCounts || {
      up: 0,
      down: 0
    },

    average_visible_vehicles: savedAnalysis.averageVisibleVehicles,

    peak_visible_vehicles: savedAnalysis.peakVisibleVehicles,

    traffic_density: savedAnalysis.trafficDensity,

    video_fps: savedAnalysis.videoFps,

    resolution: savedAnalysis.resolution,

    counting_line_position: savedAnalysis.countingLinePosition
  }
});
      setStage("completed");
      setUploadProgress(100);

    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.message ||
        "Unable to process the video. Check the AI service.";

      setError(message);
      setStage("error");
    }
  }

  function resetDashboard() {
    setSelectedFile(null);
    setResult(null);
    setStage("idle");
    setUploadProgress(0);
    setError("");
  }

  const isBusy = stage === "uploading" || stage === "processing";

  const densityClass = (
    statistics?.traffic_density || "Low"
  ).toLowerCase();

  return (
    <div className="app-shell">

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Activity size={25} />
          </div>

          <div>
            <h2>Traffic AI</h2>
            <span>Monitoring System</span>
          </div>
        </div>

        <div className="sidebar-label">MAIN MENU</div>

        <div className="nav-item active">
          <BarChart3 size={19} />
          <span>Dashboard</span>
        </div>

        <div className="nav-item">
          <Video size={19} />
          <span>Video Analysis</span>
        </div>

        <div className="nav-item">
          <Gauge size={19} />
          <span>Traffic Density</span>
        </div>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span className="status-dot"></span>
            AI Dashboard
            <span className="status-text">Ready</span>
          </div>
        </div>
      </aside>

      <main className="main-content">

        <header className="topbar">
          <div>
            <h1>Traffic Monitoring Dashboard</h1>
            <p>AI-powered vehicle counting and traffic analysis</p>
          </div>

          <button
            className="reset-button"
            onClick={resetDashboard}
            disabled={isBusy}
          >
            <RotateCcw size={17} />
            Reset
          </button>
        </header>

        <section className="welcome-section">
          <div>
            <span className="eyebrow">SMART TRAFFIC ANALYTICS</span>
            <h2>Vehicle Detection & Counting</h2>
            <p>
              Upload a traffic video to detect, track and count
              vehicles automatically.
            </p>
          </div>

          <div className="welcome-icon">
            <Activity size={52} />
          </div>
        </section>
 <LiveCamera />

 <LiveSessionHistory />
 <Analytics />
        <section className="upload-section">
          <div className="section-heading">
            <div>
              <h2>Upload Traffic Video</h2>
              <p>Select a video for AI-based traffic analysis.</p>
            </div>
          </div>

          <div
            className={`upload-box ${dragActive ? "drag-active" : ""}`}
            onDragOver={event => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <div className="upload-icon">
              <Upload size={28} />
            </div>

            <h3>Drag and drop your video here</h3>
            <p>or choose a video from your computer</p>

            <label className="choose-file-button">
              Browse Video
              <input
                type="file"
                accept=".mp4,.avi,.mov,.mkv,video/*"
                onChange={handleInputChange}
                disabled={isBusy}
                hidden
              />
            </label>

            <small>MP4, AVI, MOV, MKV · Maximum 200 MB</small>
          </div>

          {selectedFile && (
            <div className="selected-file">
              <div className="file-info">
                <Video size={22} />
                <div>
                  <strong>{selectedFile.name}</strong>
                  <span>
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              </div>

              <button
                className="analyze-button"
                onClick={analyzeVideo}
                disabled={isBusy}
              >
                {isBusy ? (
                  <>
                    <LoaderCircle className="spin" size={18} />
                    Processing
                  </>
                ) : (
                  <>
                    <Play size={18} />
                    Analyze Video
                  </>
                )}
              </button>
            </div>
          )}

          {isBusy && (
            <div className="progress-panel">
              <div className="progress-heading">
                <span>
                  {stage === "uploading"
                    ? "Uploading video..."
                    : "AI is processing video..."}
                </span>

                <strong>
                  {stage === "uploading"
                    ? `${uploadProgress}%`
                    : "Please wait"}
                </strong>
              </div>

              <div className="progress-track">
                <div
                  className={`progress-fill ${
                    stage === "processing" ? "indeterminate" : ""
                  }`}
                  style={{
                    width: stage === "uploading"
                      ? `${uploadProgress}%`
                      : "100%"
                  }}
                />
              </div>

              <p>
                Keep this page open while the AI service processes
                your video.
              </p>
            </div>
          )}

          {error && (
            <div className="error-message">
              <AlertCircle size={19} />
              <span>{error}</span>
            </div>
          )}

          {stage === "completed" && (
            <div className="success-message">
              <CheckCircle2 size={19} />
              <span>Video analysis completed successfully.</span>
            </div>
          )}
        </section>
<AnalysisHistory />
        {statistics && (
          <>
            <section className="section-heading results-heading">
              <div>
                <h2>Analysis Results</h2>
                <p>Statistics generated by YOLO11n and ByteTrack.</p>
              </div>

              <span className="completed-label">
                <CheckCircle2 size={16} />
                Completed
              </span>
            </section>

            <section className="stats-grid">
              <StatCard
                title="Unique Vehicles"
                value={statistics.total_unique_vehicles}
                description="Vehicles crossing the line"
                icon={CarFront}
              />

              <StatCard
                title="Vehicles Visible"
                value={statistics.peak_visible_vehicles}
                description="Peak visible in one frame"
                icon={Activity}
              />

              <StatCard
                title="Total Tracks"
                value={statistics.total_tracks_observed}
                description="Tracking IDs observed"
                icon={Gauge}
              />

              <StatCard
                title="Frames Processed"
                value={statistics.frames_processed}
                description={`Video FPS: ${statistics.video_fps ?? "-"}`}
                icon={Clock3}
              />
            </section>

            <section className="density-panel">
              <div className="density-info">
                <div className="density-icon">
                  <Gauge size={24} />
                </div>

                <div>
                  <span>Estimated Traffic Density</span>
                  <h2>{statistics.traffic_density || "Unknown"}</h2>
                  <p>
                    Based on average visible vehicles per frame.
                  </p>
                </div>
              </div>

              <span className={`density-badge ${densityClass}`}>
                {statistics.traffic_density || "Unknown"} Traffic
              </span>
            </section>

            <section className="charts-grid">

              <div className="chart-card">
                <div className="chart-heading">
                  <div>
                    <h3>Vehicle Categories</h3>
                    <p>Unique vehicles counted by category</p>
                  </div>
                  <BarChart3 size={21} />
                </div>

                <div className="chart-area">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={classData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#334155"
                        />

                        <XAxis
                          dataKey="name"
                          stroke="#94a3b8"
                          tick={{ fontSize: 11 }}
                        />

                        <YAxis
                          allowDecimals={false}
                          stroke="#94a3b8"
                        />

                        <Tooltip
                          contentStyle={{
                            background: "#172033",
                            border: "1px solid #334155",
                            borderRadius: "10px",
                            color: "#fff"
                          }}
                        />

                        <Bar
                          dataKey="count"
                          name="Vehicles"
                          radius={[6, 6, 0, 0]}
                        >
                          {classData.map(item => (
                            <Cell
                              key={item.key}
                              fill={item.color}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="empty-chart">
                      No vehicles crossed the counting line.
                    </p>
                  )}
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-heading">
                  <div>
                    <h3>Vehicle Distribution</h3>
                    <p>Share of counted vehicles</p>
                  </div>
                  <Activity size={21} />
                </div>

                <div className="chart-area">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="48%"
                          outerRadius={90}
                          innerRadius={48}
                          paddingAngle={3}
                        >
                          {pieData.map(item => (
                            <Cell
                              key={item.key}
                              fill={item.color}
                            />
                          ))}
                        </Pie>

                        <Tooltip />

                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="empty-chart">
                      No distribution data available yet.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="details-grid">

              <div className="detail-card">
                <h3>Vehicle Count Details</h3>

                {classData.map(item => {
                  const Icon = CLASS_CONFIG[item.key].icon;

                  return (
                    <div className="vehicle-row" key={item.key}>
                      <div className="vehicle-name">
                        <Icon size={20} />
                        <span>{item.name}</span>
                      </div>

                      <strong>{item.count}</strong>
                    </div>
                  );
                })}
              </div>

              <div className="detail-card">
                <h3>Vehicle Movement</h3>

                <div className="movement-row">
                  <div className="movement-icon down">
                    <ArrowDown size={21} />
                  </div>

                  <div>
                    <span>Moving Down</span>
                    <strong>
                      {statistics.direction_counts?.down ?? 0}
                    </strong>
                  </div>
                </div>

                <div className="movement-row">
                  <div className="movement-icon up">
                    <ArrowUp size={21} />
                  </div>

                  <div>
                    <span>Moving Up</span>
                    <strong>
                      {statistics.direction_counts?.up ?? 0}
                    </strong>
                  </div>
                </div>

                <div className="average-box">
                  <span>Average visible vehicles</span>
                  <strong>
                    {statistics.average_visible_vehicles ?? 0}
                  </strong>
                </div>
              </div>

            </section>

            <section className="video-result-section">
              <div className="section-heading">
                <div>
                  <h2>Processed Traffic Video</h2>
                  <p>Video with tracking IDs and counting line.</p>
                </div>
              </div>

              {videoUrl ? (
                <div className="video-container">
                  <video
                    src={videoUrl}
                    controls
                    playsInline
                    preload="metadata"
                  >
                    Your browser does not support video playback.
                  </video>

                  <a
                    className="download-button"
                    href={videoUrl}
                    download
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download Processed Video
                  </a>
                </div>
              ) : (
                <p className="empty-chart">
                  Processed video URL was not returned.
                </p>
              )}
            </section>
          </>
        )}

        <footer className="footer">
          <span>Vehicle Counting & Traffic Density Estimation</span>
          <span>Powered by YOLO11n · ByteTrack · OpenCV</span>
        </footer>

      </main>
    </div>
  );
}

export default App;
