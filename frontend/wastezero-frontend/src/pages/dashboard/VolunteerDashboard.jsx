import Layout from "../../components/Layout";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  FileText, Clock, CheckCircle, XCircle,
  Search, User, Globe, MapPin
} from "lucide-react";
import "../../styles/dashboard.css";
import "../../styles/volunteerDashboard.css";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

function VolunteerDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem("user")); }
    catch { return null; }
  })();

  const [applications,  setApplications]  = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [freshUser,     setFreshUser]     = useState(null); // ✅ live from DB
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    if (!storedUser || storedUser.role !== "volunteer") {
      navigate("/login");
      return;
    }
    fetchAll();
  }, [navigate]);

  const fetchAll = async () => {
    try {
      // ✅ fetch apps + opps together
      const [appsRes, oppsRes] = await Promise.all([
        axios.get(`${API}/api/applications/volunteer`,
          { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/api/opportunities/matched`,
          { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setApplications(appsRes.data  || []);
      setOpportunities(oppsRes.data || []);
    } catch (err) {
      console.log("fetchAll error:", err);
    }

    // ✅ fetch fresh profile separately so it never breaks the other calls
    try {
      const profileRes = await axios.get(`${API}/api/auth/me`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const user = profileRes.data;
      setFreshUser(user);
      // ✅ keep localStorage in sync for navbar/sidebar
      localStorage.setItem("user", JSON.stringify({ ...storedUser, ...user }));
    } catch (err) {
      console.log("profile fetch error:", err.message);
      // silently falls back to storedUser
    }

    setLoading(false);
  };

  // ✅ always prefer live DB data over stale localStorage
  const user = freshUser || storedUser;

  /* ── Profile completion ── */
  const profileFields = [
    { label: "Name",     done: !!(user?.name     && String(user.name).trim()     !== "") },
    { label: "Bio",      done: !!(user?.bio       && String(user.bio).trim()      !== "") },
    { label: "Skills",   done: !!(user?.skills    && user.skills.length           >  0)  },
    { label: "Location", done: !!(user?.location  && String(user.location).trim() !== "") },
    { label: "Phone",    done: !!(user?.phone     && String(user.phone).trim()    !== "") },
  ];

  const filled     = profileFields.filter(f => f.done).length;
  const profilePct = Math.round((filled / profileFields.length) * 100);
  const missing    = profileFields.filter(f => !f.done).map(f => f.label);

  /* ── Stats ── */
  const total    = applications.length;
  const pending  = applications.filter(a => a.status === "pending").length;
  const accepted = applications.filter(a => a.status === "accepted").length;
  const rejected = applications.filter(a => a.status === "rejected").length;
  const totalOpps = opportunities.length;
  const topOpps   = [...opportunities]
    .sort((a, b) => (b.skillMatch || 0) - (a.skillMatch || 0))
    .slice(0, 3);

  if (loading) return (
    <Layout>
      <p style={{ padding: 40, color: "var(--text-secondary)", fontSize: 14 }}>
        Loading...
      </p>
    </Layout>
  );

  return (
    <Layout>
      <div className="vol-container">

        {/* HEADER */}
        <div className="vol-header">
          <div>
            <h2 className="dashboard-title">Volunteer Dashboard</h2>
            <p className="dashboard-welcome">
              Welcome, <strong>{user?.name}</strong>
            </p>
          </div>
          <button className="vol-browse-btn" onClick={() => navigate("/opportunities")}>
            <Search size={14} /> Browse Opportunities
          </button>
        </div>

        {/* PROFILE COMPLETION */}
        {profilePct < 100 && (
          <div className="vol-profile-bar-card" onClick={() => navigate("/profile")}>
            <div className="vol-profile-bar-top">
              <span>Profile completion</span>
              <span className="vol-profile-pct">{profilePct}%</span>
            </div>
            <div className="vol-profile-bar-track">
              <div
                className="vol-profile-bar-fill"
                style={{ width: `${profilePct}%` }}
              />
            </div>
            {/* ✅ shows exactly what's missing */}
            <p className="vol-profile-bar-hint">
              {missing.length > 0
                ? `Missing: ${missing.join(", ")} — click to complete →`
                : "Almost there! A complete profile gets 3× more matches →"
              }
            </p>
          </div>
        )}

        {/* KPI CARDS */}
        <div className="dashboard-grid">
          <div className="vol-stat-card blue">
            <div className="vol-stat-icon"><FileText size={18} /></div>
            <div>
              <p className="vol-stat-label">Total Applications</p>
              <p className="vol-stat-value">{total}</p>
            </div>
          </div>
          <div className="vol-stat-card amber">
            <div className="vol-stat-icon"><Clock size={18} /></div>
            <div>
              <p className="vol-stat-label">Pending</p>
              <p className="vol-stat-value">{pending}</p>
            </div>
          </div>
          <div className="vol-stat-card green">
            <div className="vol-stat-icon"><CheckCircle size={18} /></div>
            <div>
              <p className="vol-stat-label">Accepted</p>
              <p className="vol-stat-value">{accepted}</p>
            </div>
          </div>
          <div className="vol-stat-card red">
            <div className="vol-stat-icon"><XCircle size={18} /></div>
            <div>
              <p className="vol-stat-label">Rejected</p>
              <p className="vol-stat-value">{rejected}</p>
            </div>
          </div>
          <div className="vol-stat-card teal">
            <div className="vol-stat-icon"><Globe size={18} /></div>
            <div>
              <p className="vol-stat-label">Near You</p>
              <p className="vol-stat-value">{totalOpps}</p>
            </div>
          </div>
        </div>

        {/* TOP MATCHES + QUICK ACTIONS */}
        <div className="vol-dashboard-section">

          <div className="vol-chart-box">
            <h3>Top Matched Opportunities</h3>
            {topOpps.length === 0 ? (
              <p className="vol-empty">
                No matched opportunities found near you.
                <br />
                <button className="vol-link-btn" onClick={() => navigate("/profile")}>
                  Update your location and skills →
                </button>
              </p>
            ) : (
              <div className="vol-match-list">
                {topOpps.map((opp, i) => (
                  <div
                    key={opp._id}
                    className="vol-match-item"
                    onClick={() => navigate(`/opportunity/${opp._id}`)}
                  >
                    <div className="vol-match-rank">{i + 1}</div>
                    <div className="vol-match-info">
                      <p className="vol-match-title">{opp.title}</p>
                      <p className="vol-match-meta">
                        <MapPin size={11} />
                        {opp.location || "—"}
                        {opp.distance !== undefined && (
                          <> · {opp.distance === 0 ? "Near you" : `${opp.distance} km`}</>
                        )}
                      </p>
                    </div>
                    <div
                      className="vol-match-score"
                      style={{
                        background: opp.skillMatch >= 70 ? "#d1fae5"
                          : opp.skillMatch >= 40 ? "#fef3c7" : "#f3f4f6",
                        color: opp.skillMatch >= 70 ? "#065f46"
                          : opp.skillMatch >= 40 ? "#92400e" : "#6b7280",
                      }}
                    >
                      {opp.skillMatch || 0}% match
                    </div>
                  </div>
                ))}
                <button className="vol-see-all" onClick={() => navigate("/opportunities")}>
                  See all opportunities →
                </button>
              </div>
            )}
          </div>

          <div className="vol-quick-actions">
            <h3>Quick Actions</h3>
            <button onClick={() => navigate("/opportunities")}>
              <Search size={15} /> Browse Opportunities
            </button>
            <button onClick={() => navigate("/applications")}>
              <FileText size={15} /> My Applications
            </button>
            <button onClick={() => navigate("/profile")}>
              <User size={15} /> Update Profile
            </button>
          </div>

        </div>

        {/* RECENT APPLICATIONS */}
        <div className="vol-recent-applications">
          <div className="vol-card-header">
            <h3>Recent Applications</h3>
          </div>
          {applications.length === 0 ? (
            <p className="vol-empty">
              You haven't applied to anything yet.{" "}
              <button className="vol-link-btn" onClick={() => navigate("/opportunities")}>
                Browse opportunities →
              </button>
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Opportunity</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {applications.slice(0, 5).map(app => (
                  <tr key={app._id}>
                    <td>{app.opportunity?.title || "—"}</td>
                    <td>
                      <span className={`vol-status ${app.status}`}>
                        {app.status}
                      </span>
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

export default VolunteerDashboard;