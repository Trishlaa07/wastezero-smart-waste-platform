import Layout from "../../components/Layout";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Users, Building2, Briefcase, Ban,
  Activity, Flag, AlertTriangle,
  UserPlus, ClipboardList, ShieldAlert
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, LineChart, Line
} from "recharts";
import "../../styles/dashboard.css";
import "../../styles/adminDashboard.css";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

function AdminDashboard() {
  const navigate = useNavigate();
  const token    = localStorage.getItem("token");

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user")); }
    catch { return null; }
  })();

  const [stats,   setStats]   = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "admin") navigate("/login");
  }, [navigate]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, reportsRes] = await Promise.all([
          axios.get(`${API}/api/admin/stats`,   { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/api/reports`,        { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setStats(statsRes.data);
        setReports(reportsRes.data);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [token]);

  if (loading) return <Layout><p style={{ padding: 40 }}>Loading...</p></Layout>;
  if (!stats)  return null;

  const pendingReports = reports.filter(r => r.status === "pending").length;

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun",
                      "Jul","Aug","Sep","Oct","Nov","Dec"];

  const monthlyData = monthNames.map((name, i) => ({
    name,
    Volunteers:    stats.monthlyUsers?.find(m => m._id === i + 1)?.count        || 0,
    Opportunities: stats.monthlyOpportunities?.find(m => m._id === i + 1)?.count || 0,
  }));

  const kpis = [
    { label: "Total Volunteers",     value: stats.totalUsers,         icon: Users,       color: "#1D9E75" },
    { label: "Total NGOs",           value: stats.totalNGOs,          icon: Building2,   color: "#1976d2" },
    { label: "Total Opportunities",  value: stats.totalOpportunities, icon: Briefcase,   color: "#7c3aed" },
    { label: "Open Opportunities",   value: stats.openOpportunities,  icon: Activity,    color: "#059669" },
    { label: "Suspended Users",      value: stats.suspendedUsers,     icon: Ban,         color: "#e03131" },
    { label: "Pending Reports",      value: pendingReports,           icon: Flag,        color: "#f59e0b" },
  ];

  const quickLinks = [
    { label: "Monitor Users",   icon: Users,       path: "/users",      color: "#1976d2" },
    { label: "Moderation",      icon: ShieldAlert, path: "/moderation", color: "#e03131" },
    { label: "Reports",         icon: Flag,        path: "/reports",    color: "#f59e0b" },
    { label: "Opportunities",   icon: Briefcase,   path: "/opportunities", color: "#1D9E75" },
  ];

  return (
    <Layout>
      <div className="adm-container">

        {/* HEADER */}
        <div className="adm-header">
          <div>
            <h2 className="adm-title">Admin Control Center</h2>
            <p className="adm-sub">
              Welcome back, <strong>{user?.name}</strong>
            </p>
          </div>
        </div>

        {/* REPORTS ALERT BANNER */}
        {pendingReports > 0 && (
          <div
            className="adm-alert-banner"
            onClick={() => navigate("/moderation")}
          >
            <AlertTriangle size={16} />
            <span>
              {pendingReports} pending report{pendingReports > 1 ? "s" : ""} require your attention
            </span>
            <span className="adm-alert-link">Review now →</span>
          </div>
        )}

        {/* KPI CARDS */}
        <div className="adm-kpi-grid">
          {kpis.map((k, i) => (
            <div key={i} className="adm-kpi-card">
              <div
                className="adm-kpi-icon"
                style={{ background: k.color + "18", color: k.color }}
              >
                <k.icon size={18} />
              </div>
              <div>
                <p className="adm-kpi-label">{k.label}</p>
                <p className="adm-kpi-value">{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* QUICK LINKS */}
        <div className="adm-quick-links">
          {quickLinks.map((q, i) => (
            <div
              key={i}
              className="adm-quick-card"
              onClick={() => navigate(q.path)}
            >
              <div
                className="adm-quick-icon"
                style={{ background: q.color + "18", color: q.color }}
              >
                <q.icon size={20} />
              </div>
              <span className="adm-quick-label">{q.label}</span>
            </div>
          ))}
        </div>

        {/* CHARTS */}
        <div className="adm-charts-row">

          {/* MONTHLY GROWTH LINE CHART */}
          <div className="adm-chart-card">
            <h3>Monthly Growth</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Volunteers"
                  stroke="#1D9E75"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Opportunities"
                  stroke="#1976d2"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* OPPORTUNITIES BAR CHART */}
          <div className="adm-chart-card">
            <h3>Opportunities Overview</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={[
                  { name: "Total",  value: stats.totalOpportunities,                                   fill: "#1976d2" },
                  { name: "Open",   value: stats.openOpportunities,                                    fill: "#1D9E75" },
                  { name: "Closed", value: stats.totalOpportunities - stats.openOpportunities,         fill: "#e03131" },
                ]}
                barSize={48}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[6,6,0,0]}>
                  {[
                    { fill: "#1976d2" },
                    { fill: "#1D9E75" },
                    { fill: "#e03131" },
                  ].map((entry, i) => (
                    <rect key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* RECENT ACTIVITY FEED */}
        <div className="adm-activity-card">
          <h3>Recent Reports</h3>
          {reports.length === 0 ? (
            <p className="adm-empty">No reports yet</p>
          ) : (
            <div className="adm-activity-list">
              {reports.slice(0, 6).map((r, i) => (
                <div key={i} className="adm-activity-item">
                  <div className={`adm-activity-dot ${r.status}`} />
                  <div className="adm-activity-info">
                    <p className="adm-activity-msg">
                      <strong>{r.reporter?.name || "Someone"}</strong> reported{" "}
                      <strong>"{r.opportunity?.title || "an opportunity"}"</strong>
                    </p>
                    <p className="adm-activity-reason">{r.reason}</p>
                  </div>
                  <span className={`adm-activity-status ${r.status}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
          {reports.length > 6 && (
            <button
              className="adm-see-all"
              onClick={() => navigate("/moderation")}
            >
              See all reports →
            </button>
          )}
        </div>

      </div>
    </Layout>
  );
}

export default AdminDashboard;