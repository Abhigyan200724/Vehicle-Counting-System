
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Clock, Trash2, RefreshCw, Car, Activity } from "lucide-react";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

export default function LiveSessionHistory() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_BASE_URL}/api/live-sessions`
      );

      setSessions(response.data.sessions || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load live monitoring history."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const deleteSession = async (id) => {
    if (!window.confirm("Delete this live monitoring session?")) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/live-sessions/${id}`);

      setSessions(old =>
        old.filter(session => session._id !== id)
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Could not delete this session."
      );
    }
  };

  const formatDuration = (seconds = 0) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes} min ${remainingSeconds} sec`;
  };

  return (
    <section className="live-history-section">
      <div className="live-history-heading">
        <div>
          <h2>Live Monitoring History</h2>
          <p>Previously completed camera monitoring sessions</p>
        </div>

        <button
          className="live-history-refresh"
          onClick={fetchSessions}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {loading && <p>Loading monitoring history...</p>}

      {error && <p className="camera-error">{error}</p>}

      {!loading && !error && sessions.length === 0 && (
        <div className="live-history-empty">
          <Clock size={32} />
          <p>No live monitoring sessions saved yet.</p>
        </div>
      )}

      <div className="live-history-list">
        {sessions.map(session => (
          <article className="live-history-card" key={session._id}>
            <div className="live-history-card-heading">
              <div>
                <h3>
                  {new Date(session.startedAt).toLocaleString()}
                </h3>
                <span>
                  Duration: {formatDuration(session.durationSeconds)}
                </span>
              </div>

              <button
                className="live-history-delete"
                onClick={() => deleteSession(session._id)}
                aria-label="Delete session"
                title="Delete session"
              >
                <Trash2 size={17} />
              </button>
            </div>

            <div className="live-history-stats">
              <div>
                <Car size={18} />
                <span>Counted vehicles</span>
                <strong>{session.totalUniqueVehicles}</strong>
              </div>

              <div>
                <Activity size={18} />
                <span>Peak visible</span>
                <strong>{session.peakVisibleVehicles}</strong>
              </div>

              <div>
                <Clock size={18} />
                <span>Traffic density</span>
                <strong>{session.trafficDensity}</strong>
              </div>
            </div>

            <div className="live-history-categories">
              <span>Cars: {session.vehiclesByClass?.car ?? 0}</span>
              <span>Motorcycles: {session.vehiclesByClass?.motorcycle ?? 0}</span>
              <span>Buses: {session.vehiclesByClass?.bus ?? 0}</span>
              <span>Trucks: {session.vehiclesByClass?.truck ?? 0}</span>
            </div>

            <div className="live-history-directions">
              <span>Up: {session.directionCounts?.up ?? 0}</span>
              <span>Down: {session.directionCounts?.down ?? 0}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
