
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Clock3, Trash2, RefreshCw, Video, AlertCircle } from "lucide-react";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const AI_BASE_URL = (
  import.meta.env.VITE_AI_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

function AnalysisHistory() {

  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchHistory = useCallback(async () => {

    try {

      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_BASE_URL}/api/analysis`
      );

      setAnalyses(response.data.analyses || []);

    } catch (err) {

      setError(
        err.response?.data?.message ||
        "Unable to load analysis history."
      );

    } finally {

      setLoading(false);

    }

  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  async function deleteRecord(id) {

    const confirmed = window.confirm(
      "Are you sure you want to delete this analysis record?"
    );

    if (!confirmed) return;

    try {

      await axios.delete(
        `${API_BASE_URL}/api/analysis/${id}`
      );

      setAnalyses(old =>
        old.filter(item => item._id !== id)
      );

    } catch (err) {

      setError(
        err.response?.data?.message ||
        "Unable to delete analysis."
      );

    }

  }

  return (
    <section className="history-section">

      <div className="history-heading">
        <div>
          <h2>
            <Clock3 size={20} />
            Analysis History
          </h2>

          <p>Previously processed traffic videos</p>
        </div>

        <button
          className="history-refresh"
          onClick={fetchHistory}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {loading && (
        <p className="history-message">
          Loading analysis history...
        </p>
      )}

      {error && (
        <div className="error-message">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {!loading && !error && analyses.length === 0 && (
        <div className="history-empty">
          <Video size={35} />
          <h3>No analysis history yet</h3>
          <p>
            Upload and process your first traffic video
            to see its results here.
          </p>
        </div>
      )}

      <div className="history-list">

        {analyses.map(item => {

          const videoUrl = item.videoUrl
            ? `${AI_BASE_URL}${item.videoUrl}`
            : "";

          return (
            <article className="history-card" key={item._id}>

              <div className="history-file-icon">
                <Video size={23} />
              </div>

              <div className="history-details">

                <h3>{item.originalFileName}</h3>

                <p>
                  {new Date(item.createdAt).toLocaleString()}
                </p>

                <div className="history-stats">
                  <span>
                    Vehicles: <strong>{item.totalUniqueVehicles}</strong>
                  </span>

                  <span>
                    Density: <strong>{item.trafficDensity}</strong>
                  </span>

                  <span>
                    Tracks: <strong>{item.totalTracksObserved}</strong>
                  </span>
                </div>

                {videoUrl && (
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="history-video-link"
                  >
                    View processed video
                  </a>
                )}

              </div>

              <button
                className="history-delete"
                onClick={() => deleteRecord(item._id)}
                title="Delete analysis record"
                aria-label={`Delete ${item.originalFileName}`}
              >
                <Trash2 size={18} />
              </button>

            </article>
          );
        })}

      </div>

    </section>
  );
}

export default AnalysisHistory;
