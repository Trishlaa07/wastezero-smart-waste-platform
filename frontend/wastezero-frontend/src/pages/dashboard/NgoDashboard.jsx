import Layout from "../../components/Layout";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { useSocket } from "../../context/SocketContext";
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import {
  ClipboardList, Users, PlusCircle,
  CheckCircle, Clock, XCircle,
  AlertCircle, ChevronRight, Package,
  Truck, MapPin,
} from "lucide-react";
import "../../styles/dashboard.css";
import "../../styles/ngoDashboard.css";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

function PickupStatusPill({ status }) {
  const map = {
    pending:      { bg: "#fef3c7", color: "#92400e" },
    accepted:     { bg: "#dcfce7", color: "#166534" },
    "in-transit": { bg: "#dbeafe", color: "#1e40af" },
    completed:    { bg: "#f3f4f6", color: "#374151" },
    cancelled:    { bg: "#fee2e2", color: "#991b1b" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color, textTransform: "capitalize", whiteSpace: "nowrap",
    }}>
      {status}
    </span>
  );
}

function NGODashboard() {
  const navigate = useNavigate();
  const token    = localStorage.getItem("token");
  const socket   = useSocket();

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user")); }
    catch { return null; }
  })();

  const [stats,         setStats]         = useState({ activeOpportunities: 0, totalApplications: 0 });
  const [applications,  setApplications]  = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [pickups,       setPickups]       = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    if (!user || user.role !== "ngo") { navigate("/login"); return; }
    fetchAll();
  }, [navigate]);

  const fetchAll = async () => {
    try {
      const [statsRes, appsRes, oppsRes, pickupsRes] = await Promise.all([
        axios.get(`${API}/api/opportunities/ngo/dashboard-stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/api/applications/ngo`,                  { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/api/opportunities/my`,                  { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/api/pickups/ngo`,                       { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setStats({
        activeOpportunities: statsRes.data.activeOpportunities || 0,
        totalApplications:   statsRes.data.totalApplications   || 0,
      });
      setApplications(appsRes.data               || []);
      setOpportunities(oppsRes.data              || []);
      setPickups(Array.isArray(pickupsRes.data) ? pickupsRes.data : []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Real-time: new pickup from a volunteer ──
  useEffect(() => {
    if (!socket) return;
    const handleNew = (newPickup) => {
      setPickups(prev => {
        if (prev.find(p => p._id === newPickup._id)) return prev;
        return [newPickup, ...prev];
      });
    };
    socket.on("newPickup", handleNew);
    return () => socket.off("newPickup", handleNew);
  }, [socket]);

  // ── Real-time: pickup updated ──
  useEffect(() => {
    if (!socket) return;
    const handleUpdated = (updated) => {
      setPickups(prev =>
        prev.map(p => p._id === updated._id ? { ...p, ...updated } : p)
      );
    };
    socket.on("pickupUpdated", handleUpdated);
    return () => socket.off("pickupUpdated", handleUpdated);
  }, [socket]);

  const pending  = applications.filter(a => a.status === "pending").length;
  const accepted = applications.filter(a => a.status === "accepted").length;
  const rejected = applications.filter(a => a.status === "rejected").length;

  /* Pickup stats */
  const pickupPending   = pickups.filter(p => p.status === "pending").length;
  const pickupAccepted  = pickups.filter(p => p.status === "accepted").length;
  const pickupInTransit = pickups.filter(p => p.status === "in-transit").length;
  const pickupCompleted = pickups.filter(p => p.status === "completed").length;

  /* Recent pickups needing attention (pending, unassigned) */
  const pendingPickups = pickups
    .filter(p => p.status === "pending")
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 3);

  /* Per-opportunity chart data */
  const oppChartData = opportunities.slice(0, 6).map(o => ({
    name:    o.title.length > 18 ? o.title.slice(0, 18) + "…" : o.title,
    Applied: o.applicantCount   || 0,
    Needed:  o.volunteersNeeded || 1,
  }));

  if (loading) return <Layout><p style={{ padding: 40 }}>Loading...</p></Layout>;

  return (
    <Layout>
      <div className="ngo-container">

        {/* HEADER */}
        <div className="ngo-header">
          <div>
            <h2 className="ngo-dashboard-title">NGO Dashboard</h2>
            <p className="ngo-welcome">Welcome, <strong>{user?.name}</strong></p>
          </div>
          <button className="ngo-create-btn" onClick={() => navigate("/create-opportunity")}>
            <PlusCircle size={15} /> Create Opportunity
          </button>
        </div>

        {/* PENDING APPLICATIONS ALERT */}
        {pending > 0 && (
          <div className="ngo-alert-banner" onClick={() => navigate("/applications")}>
            <AlertCircle size={15} />
            <span>{pending} application{pending > 1 ? "s" : ""} waiting for your review</span>
            <span className="ngo-alert-link">Review now →</span>
          </div>
        )}

        {/* PENDING PICKUPS ALERT */}
        {pickupPending > 0 && (
          <div
            className="ngo-alert-banner"
            style={{ background: "#eff6ff", borderColor: "#bfdbfe", color: "#1e40af", cursor: "pointer" }}
            onClick={() => navigate("/manage-pickups")}
          >
            <Package size={15} />
            <span>{pickupPending} pickup{pickupPending > 1 ? "s" : ""} waiting for agent assignment</span>
            <span className="ngo-alert-link">Assign now →</span>
          </div>
        )}

        {/* APPLICATION KPI CARDS */}
        <div className="dashboard-grid">
          <div className="ngo-stat-card teal">
            <div className="ngo-stat-icon"><ClipboardList size={18} /></div>
            <div>
              <p className="ngo-stat-label">Opportunities</p>
              <p className="ngo-stat-value">{stats.activeOpportunities}</p>
            </div>
          </div>
          <div className="ngo-stat-card blue">
            <div className="ngo-stat-icon"><Users size={18} /></div>
            <div>
              <p className="ngo-stat-label">Total Applications</p>
              <p className="ngo-stat-value">{stats.totalApplications}</p>
            </div>
          </div>
          <div className="ngo-stat-card green">
            <div className="ngo-stat-icon"><CheckCircle size={18} /></div>
            <div>
              <p className="ngo-stat-label">Accepted</p>
              <p className="ngo-stat-value">{accepted}</p>
            </div>
          </div>
          <div className="ngo-stat-card amber">
            <div className="ngo-stat-icon"><Clock size={18} /></div>
            <div>
              <p className="ngo-stat-label">Pending</p>
              <p className="ngo-stat-value">{pending}</p>
            </div>
          </div>
          <div className="ngo-stat-card red">
            <div className="ngo-stat-icon"><XCircle size={18} /></div>
            <div>
              <p className="ngo-stat-label">Rejected</p>
              <p className="ngo-stat-value">{rejected}</p>
            </div>
          </div>
        </div>

        {/* PICKUP KPI CARDS */}
        <div className="dashboard-grid" style={{ marginTop: 0 }}>
          <div className="ngo-stat-card blue">
            <div className="ngo-stat-icon"><Package size={18} /></div>
            <div>
              <p className="ngo-stat-label">Total Pickups</p>
              <p className="ngo-stat-value">{pickups.length}</p>
            </div>
          </div>
          <div className="ngo-stat-card amber">
            <div className="ngo-stat-icon"><Clock size={18} /></div>
            <div>
              <p className="ngo-stat-label">Pending Pickups</p>
              <p className="ngo-stat-value">{pickupPending}</p>
            </div>
          </div>
          <div className="ngo-stat-card teal">
            <div className="ngo-stat-icon"><CheckCircle size={18} /></div>
            <div>
              <p className="ngo-stat-label">Assigned</p>
              <p className="ngo-stat-value">{pickupAccepted}</p>
            </div>
          </div>
          <div className="ngo-stat-card blue">
            <div className="ngo-stat-icon"><Truck size={18} /></div>
            <div>
              <p className="ngo-stat-label">In Transit</p>
              <p className="ngo-stat-value">{pickupInTransit}</p>
            </div>
          </div>
          <div className="ngo-stat-card green">
            <div className="ngo-stat-icon"><CheckCircle size={18} /></div>
            <div>
              <p className="ngo-stat-label">Completed</p>
              <p className="ngo-stat-value">{pickupCompleted}</p>
            </div>
          </div>
        </div>

        {/* CHART + QUICK ACTIONS */}
        <div className="ngo-dashboard-section">
          <div className="ngo-chart-box">
            <h3>Applicants vs Spots Needed</h3>
            {oppChartData.length === 0 ? (
              <p className="ngo-empty">No opportunities yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={oppChartData} layout="vertical" barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="Needed"  fill="#e5e7eb" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Applied" fill="#1D9E75" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="ngo-quick-actions">
            <h3>Quick Actions</h3>
            <button onClick={() => navigate("/create-opportunity")}>
              <PlusCircle size={15} /> Create Opportunity
            </button>
            <button onClick={() => navigate("/opportunities")}>
              <ClipboardList size={15} /> Manage Opportunities
            </button>
            <button onClick={() => navigate("/applications")}>
              <Users size={15} /> View Applications
            </button>
            <button onClick={() => navigate("/manage-pickups")}>
              <Package size={15} /> Manage Pickups
            </button>
          </div>
        </div>

        {/* PENDING PICKUPS LIST */}
        {pendingPickups.length > 0 && (
          <div className="ngo-opp-list-card">
            <div className="ngo-card-header">
              <h3>Pickups Needing Assignment</h3>
              <button className="ngo-see-all" onClick={() => navigate("/manage-pickups")}>
                See all →
              </button>
            </div>
            <div className="ngo-opp-list">
              {pendingPickups.map(p => (
                <div
                  key={p._id}
                  className="ngo-opp-item"
                  onClick={() => navigate("/manage-pickups")}
                  style={{ cursor: "pointer" }}
                >
                  <div className="ngo-opp-info">
                    <p className="ngo-opp-title">
                      {p.volunteer?.name || "Volunteer"} · {p.wasteType || "—"}
                    </p>
                    <p className="ngo-opp-meta" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <MapPin size={11} /> {p.city} · {p.pickupDate} · {p.timeSlot}
                    </p>
                  </div>
                  <div className="ngo-opp-right">
                    <PickupStatusPill status={p.status} />
                    <ChevronRight size={14} style={{ color: "#9ca3af" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OPPORTUNITIES LIST */}
        {opportunities.length > 0 && (
          <div className="ngo-opp-list-card">
            <div className="ngo-card-header">
              <h3>Your Opportunities</h3>
              <button className="ngo-see-all" onClick={() => navigate("/opportunities")}>
                See all →
              </button>
            </div>
            <div className="ngo-opp-list">
              {opportunities.slice(0, 5).map(opp => (
                <div
                  key={opp._id}
                  className="ngo-opp-item"
                  onClick={() => navigate(`/opportunity/${opp._id}`)}
                >
                  <div className="ngo-opp-info">
                    <p className="ngo-opp-title">{opp.title}</p>
                    <p className="ngo-opp-meta">
                      {opp.applicantCount || 0} / {opp.volunteersNeeded || 1} volunteers
                    </p>
                  </div>
                  <div className="ngo-opp-right">
                    <span className={`ngo-opp-status ${opp.status?.toLowerCase()}`}>{opp.status}</span>
                    <ChevronRight size={14} style={{ color: "#9ca3af" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RECENT APPLICATIONS */}
        <div className="ngo-recent-applications">
          <div className="ngo-card-header">
            <h3>Recent Applications</h3>
            <button className="ngo-see-all" onClick={() => navigate("/applications")}>
              See all →
            </button>
          </div>
          {applications.length === 0 ? (
            <p className="ngo-empty">No applications yet</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Volunteer</th>
                  <th>Opportunity</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {applications.slice(0, 5).map(app => (
                  <tr key={app._id}>
                    <td>{app.volunteer?.name || "—"}</td>
                    <td>{app.opportunity?.title || "—"}</td>
                    <td>
                      <span className={`vol-status ${app.status}`}>{app.status}</span>
                    </td>
                    <td>{new Date(app.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </Layout>
  );
}

export default NGODashboard;