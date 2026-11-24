
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from "recharts";

import {
  CarFront,
  Video,
  Camera,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  RefreshCw
} from "lucide-react";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const COLORS = ["#3b82f6", "#16a34a", "#f59e0b", "#a855f7"];

export default function Analytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_BASE_URL}/api/analytics`,
        { params: { days } }
      );

      setData(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load analytics."
      );
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const exportExcel = () => {
    if (!data) return;

    const summary = Object.entries(data.summary).map(
      ([metric, value]) => ({
        Metric: metric,
        Value: value
      })
    );

    const vehicles = Object.entries(data.vehicleCounts).map(
      ([vehicle, count]) => ({
        Vehicle: vehicle,
        Count: count
      })
    );

    const density = Object.entries(data.densityCounts).map(
      ([level, count]) => ({
        Density: level,
        Sessions: count
      })
    );

    const daily = data.dailyTrend.map(item => ({
      Date: item.date,
      Vehicles: item.vehicles,
      Sessions: item.sessions
    }));

    const hourly = data.hourlyTrend.map(item => ({
      Hour: item.hour,
      Vehicles: item.vehicles,
      Sessions: item.sessions
    }));

    const workbook = XLSX.utils.book_new();

    const addSheet = (name, rows) => {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, name);
    };

    addSheet("Summary", summary);
    addSheet("Vehicles", vehicles);
    addSheet("Density", density);
    addSheet("Daily Trend", daily);
    addSheet("Hourly Trend", hourly);

    XLSX.writeFile(
      workbook,
      `traffic-report-${days}-days.xlsx`
    );
  };

  const exportPDF = () => {
    if (!data) return;

    const pdf = new jsPDF();
    let y = 18;

    pdf.setFontSize(18);
    pdf.text("Traffic Analytics Report", 14, y);

    y += 10;
    pdf.setFontSize(10);
    pdf.text(`Reporting period: Last ${days} days`, 14, y);

    y += 12;
    pdf.setFontSize(13);
    pdf.text("Summary", 14, y);

    y += 8;
    pdf.setFontSize(10);

    Object.entries(data.summary).forEach(([key, value]) => {
      if (y > 275) {
        pdf.addPage();
        y = 20;
      }

      pdf.text(
        `${key.replace(/([A-Z])/g, " $1")}: ${value}`,
        14,
        y
      );

      y += 7;
    });

    y += 8;
    pdf.setFontSize(13);
    pdf.text("Vehicle Categories", 14, y);

    y += 8;
    pdf.setFontSize(10);

    Object.entries(data.vehicleCounts).forEach(([key, value]) => {
      if (y > 275) {
        pdf.addPage();
        y = 20;
      }

      pdf.text(`${key}: ${value}`, 14, y);
      y += 7;
    });

    y += 8;
    pdf.setFontSize(13);
    pdf.text("Daily Traffic Trend", 14, y);

    y += 8;
    pdf.setFontSize(9);

    data.dailyTrend.forEach(item => {
      if (y > 275) {
        pdf.addPage();
        y = 20;
      }

      pdf.text(
        `${item.date} | Vehicles: ${item.vehicles} | Sessions: ${item.sessions}`,
        14,
        y
      );

      y += 6;
    });

    pdf.save(`traffic-report-${days}-days.pdf`);
  };

  if (loading && !data) {
    return <div className="analytics-section">Loading analytics...</div>;
  }

  if (error && !data) {
    return (
      <div className="analytics-section">
        <p className="camera-error">{error}</p>
        <button onClick={fetchAnalytics}>Try Again</button>
      </div>
    );
  }

  if (!data) return null;

  const summary = data.summary;

  const vehicleData = Object.entries(data.vehicleCounts).map(
    ([name, value]) => ({
      name,
      value
    })
  );

  const densityData = Object.entries(data.densityCounts).map(
    ([name, value]) => ({
      name,
      value
    })
  );

  const sourceData = Object.entries(data.sourceCounts).map(
    ([name, value]) => ({
      name,
      value
    })
  );

  return (
    <section className="analytics-section">
      <div className="analytics-heading">
        <div>
          <h2>Traffic Analytics & Reports</h2>
          <p>Analyse your saved traffic monitoring results</p>
        </div>

        <div className="analytics-actions">
          <select
            value={days}
            onChange={event => setDays(Number(event.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>

          <button onClick={fetchAnalytics} disabled={loading}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="camera-error">{error}</p>}

      <div className="analytics-export">
        <button onClick={exportExcel}>
          <FileSpreadsheet size={17} />
          Export Excel
        </button>

        <button onClick={exportPDF}>
          <FileText size={17} />
          Export PDF
        </button>
      </div>

      <div className="analytics-summary-grid">
        <div className="analytics-summary-card">
          <CarFront />
          <span>Total Vehicles</span>
          <strong>{summary.totalVehicles}</strong>
        </div>

        <div className="analytics-summary-card">
          <Video />
          <span>Uploaded Videos</span>
          <strong>{summary.uploadedVideoSessions}</strong>
        </div>

        <div className="analytics-summary-card">
          <Camera />
          <span>Live Sessions</span>
          <strong>{summary.liveCameraSessions}</strong>
        </div>

        <div className="analytics-summary-card">
          <TrendingUp />
          <span>Peak Visible Vehicles</span>
          <strong>{summary.peakVisibleVehicles}</strong>
        </div>
      </div>

      <div className="analytics-extra-grid">
        <div className="analytics-info-card">
          <span>Total Sessions</span>
          <strong>{summary.totalSessions}</strong>
        </div>

        <div className="analytics-info-card">
          <span>Average Vehicles / Session</span>
          <strong>{summary.averageVehiclesPerSession}</strong>
        </div>

        <div className="analytics-info-card">
          <span>Average Visible Vehicles</span>
          <strong>{summary.averageVisibleVehicles}</strong>
        </div>

        <div className="analytics-info-card">
          <span>Average Live Duration</span>
          <strong>{summary.averageLiveDuration} sec</strong>
        </div>
      </div>

      <div className="analytics-chart-grid">
        <div className="analytics-chart-card">
          <h3>Daily Vehicle Count</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="vehicles"
                stroke="#3b82f6"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-chart-card">
          <h3>Hourly Traffic Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.hourlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" interval={3} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="vehicles" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-chart-card">
          <h3>Vehicle Categories</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={vehicleData}
                dataKey="value"
                nameKey="name"
                outerRadius={95}
                label
              >
                {vehicleData.map((item, index) => (
                  <Cell
                    key={item.name}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-chart-card">
          <h3>Traffic Density</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={densityData}
                dataKey="value"
                nameKey="name"
                outerRadius={95}
                label
              >
                {densityData.map((item, index) => (
                  <Cell
                    key={item.name}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-chart-card">
          <h3>Analysis Source Comparison</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sourceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#a855f7" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="analytics-direction-card">
        <h3>Vehicle Direction Statistics</h3>
        <div>
          <span>Up direction: <strong>{summary.totalUp}</strong></span>
          <span>Down direction: <strong>{summary.totalDown}</strong></span>
        </div>
      </div>
    </section>
  );
}
