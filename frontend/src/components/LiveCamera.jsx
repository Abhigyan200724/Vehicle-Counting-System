import axios from "axios";
import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Activity,
  Car,
  RefreshCw
} from "lucide-react";

const AI_BASE_URL = (
  import.meta.env.VITE_AI_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const WS_URL = AI_BASE_URL.replace(/^http/, "ws") + "/ws/live";

export default function LiveCamera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const waitingRef = useRef(false);
  const startedAtRef = useRef(null);
  const latestStatsRef = useRef(null);

  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("Camera stopped");
  const [error, setError] = useState("");
  const [image, setImage] = useState("");
  const [stats, setStats] = useState(null);

  
const stopCamera = async () => {
  if (intervalRef.current) {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  const finalStats = latestStatsRef.current;
  const startedAt = startedAtRef.current;
  const endedAt = new Date();

  // Close the WebSocket.
  if (socketRef.current) {
    socketRef.current.close();
    socketRef.current = null;
  }

  // Release the webcam.
  if (streamRef.current) {
    streamRef.current.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }

  if (videoRef.current) {
    videoRef.current.srcObject = null;
  }

  waitingRef.current = false;
  startedAtRef.current = null;
  latestStatsRef.current = null;

  setRunning(false);
  setStatus("Camera stopped");

  // Save only sessions that actually processed frames.
  if (startedAt && finalStats?.frames_processed > 0) {
    const durationSeconds = Math.max(
      0,
      Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)
    );

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/live-sessions`,
        {
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          durationSeconds,
          statistics: finalStats
        }
      );

      if (response.data.success) {
        setStatus("Session saved successfully");
      }
    } catch (error) {
      console.error("Could not save live session:", error);
      setError(
        error.response?.data?.message ||
        "Camera stopped, but session could not be saved."
      );
    }
  }
};


  const startCamera = async () => {
    try {
      setError("");
      setImage("");
      setStats(null);
      setStatus("Requesting camera permission...");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "environment"
        },
        audio: false
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setStatus("Connecting to AI service...");

      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        startedAtRef.current = new Date();
        setRunning(true);
        setStatus("Live monitoring");

        intervalRef.current = setInterval(() => {
          if (
            socket.readyState !== WebSocket.OPEN ||
            waitingRef.current
          ) return;

          const video = videoRef.current;
          const canvas = canvasRef.current;

          if (!video || !canvas || video.readyState < 2) return;

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const context = canvas.getContext("2d");
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          const frame = canvas.toDataURL("image/jpeg", 0.6);

          waitingRef.current = true;
          socket.send(JSON.stringify({ frame }));
        }, 180);
      };

      socket.onmessage = (event) => {
        waitingRef.current = false;

        const data = JSON.parse(event.data);

        if (data.error) {
          setError(data.error);
          return;
        }

        if (data.image) {
          setImage(`data:image/jpeg;base64,${data.image}`);
        }

        if (data.statistics) {
              latestStatsRef.current = data.statistics;
              setStats(data.statistics);
}
      };

      socket.onerror = () => {
        setError("Could not connect to the AI WebSocket service.");
        setStatus("Connection error");
      };

      socket.onclose = () => {
        setRunning(false);
        setStatus("Connection closed");
      };

    } catch (err) {
      stopCamera();
      setError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Allow camera access in your browser."
          : err.message || "Could not start camera."
      );
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <section className="live-camera-section">
      <div className="live-camera-heading">
        <div>
          <h2>Live Traffic Monitoring</h2>
          <p>Real-time vehicle detection and counting</p>
        </div>

        <span className={running ? "live-status active" : "live-status"}>
          <Activity size={16} />
          {status}
        </span>
      </div>

      <div className="live-camera-layout">
        <div className="live-video-panel">
          <div className="live-video">
            {image ? (
              <img src={image} alt="Live vehicle detection" />
            ) : (
              <div className="camera-placeholder">
                <Camera size={48} />
                <p>Start your camera to begin monitoring</p>
              </div>
            )}
          </div>

          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{ display: "none" }}
          />

          <canvas ref={canvasRef} style={{ display: "none" }} />

          <div className="camera-controls">
            {!running ? (
              <button onClick={startCamera}>
                <Camera size={17} />
                Start Live Monitoring
              </button>
            ) : (
              <button className="stop-camera" onClick={stopCamera}>
                <CameraOff size={17} />
                Stop Monitoring
              </button>
            )}
          </div>

          {error && <p className="camera-error">{error}</p>}
        </div>

        <div className="live-stats-panel">
          <h3>Live Statistics</h3>

          <div className="live-stat-card">
            <Car />
            <div>
              <span>Total Counted Vehicles</span>
              <strong>{stats?.total_unique_vehicles ?? 0}</strong>
            </div>
          </div>

          <div className="live-stat-card">
            <Activity />
            <div>
              <span>Currently Visible</span>
              <strong>{stats?.visible_vehicles ?? 0}</strong>
            </div>
          </div>

          <div className="live-stat-card">
            <RefreshCw />
            <div>
              <span>Peak Visible Vehicles</span>
              <strong>{stats?.peak_visible_vehicles ?? 0}</strong>
            </div>
          </div>

          <div className="live-density">
            <span>Traffic Density</span>
            <strong>{stats?.traffic_density ?? "Waiting..."}</strong>
          </div>

          <h3>Vehicle Categories</h3>
          {["car", "motorcycle", "bus", "truck"].map(type => (
            <div className="vehicle-category" key={type}>
              <span>{type}</span>
              <strong>{stats?.vehicles_by_class?.[type] ?? 0}</strong>
            </div>
          ))}

          <h3>Direction</h3>
          <div className="vehicle-category">
            <span>Down</span>
            <strong>{stats?.direction_counts?.down ?? 0}</strong>
          </div>
          <div className="vehicle-category">
            <span>Up</span>
            <strong>{stats?.direction_counts?.up ?? 0}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
