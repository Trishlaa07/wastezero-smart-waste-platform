import { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import Layout from "../../components/Layout";
import { useSocket } from "../../context/SocketContext";
import {
  CheckCircle, XCircle, Clock,
  Check, X, Search, Briefcase,
  Users, ChevronDown
} from "lucide-react";
import "../../styles/application.css";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

/* ── Skill match helper ── */
const computeMatch = (volSkills = [], requiredSkills = []) => {
  if (!requiredSkills.length) return { pct: 0, matched: [], missing: [] };
  const volLower = volSkills.map(s => s.toLowerCase());
  const matched  = requiredSkills.filter(s => volLower.includes(s.toLowerCase()));
  const missing  = requiredSkills.filter(s => !volLower.includes(s.toLowerCase()));
  const pct      = Math.round((matched.length / requiredSkills.length) * 100);
  return { pct, matched, missing };
};

const matchClass = (pct) =>
  pct >= 70 ? "high" : pct >= 30 ? "medium" : "low";

const matchColor = (pct) =>
  pct >= 70 ? "#1D9E75" : pct >= 30 ? "#f59e0b" : "#e5e7eb";

function Applications() {
  const socket = useSocket();

  const [applications, setApplications] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [openGroups,   setOpenGroups]   = useState({});
  const [selectedApp,  setSelectedApp]  = useState(null);
  const [showModal,    setShowModal]    = useState(false);

  const token = localStorage.getItem("token");

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user")); }
    catch { return null; }
  }, []);

  /* ── Fetch ── */
  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const url = user?.role === "volunteer"
        ? `${API}/api/applications/volunteer`
        : `${API}/api/applications/ngo`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApplications(res.data);

      /* Auto-open all groups on first load */
      if (user?.role === "ngo") {
        const groups = {};
        res.data.forEach(app => {
          const id = app.opportunity?._id;
          if (id) groups[id] = true;
        });
        setOpenGroups(groups);
      }

    } catch {
      setError("Failed to load applications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [token, user?.role]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  /* ── Real-time ── */
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = ({ opportunityId, status }) => {
      setApplications(prev =>
        prev.map(app =>
          app.opportunity?._id === opportunityId
            ? { ...app, status } : app
        )
      );
    };

    const handleNew = (newApp) => {
      if (user?.role === "ngo") {
        setApplications(prev => {
          if (prev.find(a => a._id === newApp._id)) return prev;
          const id = newApp.opportunity?._id;
          if (id) setOpenGroups(g => ({ ...g, [id]: true }));
          return [newApp, ...prev];
        });
      }
    };

    socket.on("applicationUpdate", handleUpdate);
    socket.on("newApplication",    handleNew);
    return () => {
      socket.off("applicationUpdate", handleUpdate);
      socket.off("newApplication",    handleNew);
    };
  }, [socket, user?.role]);

  /* ── Accept / Reject ── */
  const updateStatus = async (e, id, status) => {
    e.stopPropagation();
    try {
      await axios.put(
        `${API}/api/applications/${id}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setApplications(prev =>
        prev.map(app => app._id === id ? { ...app, status } : app)
      );
      if (selectedApp?._id === id) {
        setSelectedApp(prev => ({ ...prev, status }));
      }
    } catch (err) {
      console.log(err);
    }
  };

  /* ── Toggle group ── */
  const toggleGroup = (oppId) => {
    setOpenGroups(prev => ({ ...prev, [oppId]: !prev[oppId] }));
  };

  /* ── Open modal ── */
  const openModal = (e, app) => {
    e.stopPropagation();
    setSelectedApp(app);
    setShowModal(true);
  };

  /* ── Group by opportunity ── */
  const grouped = useMemo(() => {
    const map = {};
    applications.forEach(app => {
      const opp = app.opportunity;
      if (!opp?._id) return;
      if (!map[opp._id]) {
        map[opp._id] = { opportunity: opp, apps: [] };
      }
      map[opp._id].apps.push(app);
    });

    return Object.values(map).sort((a, b) => {
      const aPending = a.apps.filter(x => x.status === "pending").length;
      const bPending = b.apps.filter(x => x.status === "pending").length;
      return bPending - aPending;
    });
  }, [applications]);

  /* ── Filtered ── */
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    return grouped
      .map(g => ({
        ...g,
        apps: g.apps.filter(a =>
          a.volunteer?.name?.toLowerCase().includes(q) ||
          g.opportunity?.title?.toLowerCase().includes(q)
        )
      }))
      .filter(g => g.apps.length > 0);
  }, [grouped, search]);

  const renderBadge = (status) => (
    <span className={`badge ${status}`}>
      {status === "accepted" && <CheckCircle size={10} />}
      {status === "pending"  && <Clock size={10} />}
      {status === "rejected" && <XCircle size={10} />}
      {status}
    </span>
  );

  const modalMatch = useMemo(() => {
    if (!selectedApp) return null;
    return computeMatch(
      selectedApp.volunteer?.skills,
      selectedApp.opportunity?.requiredSkills
    );
  }, [selectedApp]);

  return (
    <Layout>
      <div className="applications-container">

        {/* HEADER */}
        <div className="applications-header">
          <h2 className="page-title">
            {user?.role === "volunteer" ? "My Applications" : "Manage Applications"}
          </h2>
          <p className="applications-sub">
            {user?.role === "volunteer"
              ? "Track the status of your applications"
              : "Applications grouped by opportunity — click a volunteer to see their details"}
          </p>
        </div>

        {/* SEARCH */}
        {!loading && !error && applications.length > 0 && (
          <div className="app-search-wrapper">
            <Search size={14} />
            <input
              type="text"
              placeholder={
                user?.role === "volunteer"
                  ? "Search opportunity..."
                  : "Search volunteer or opportunity..."
              }
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}

        {loading && <div className="loading-state">Loading...</div>}

        {error && (
          <div className="error-banner">
            {error}
            <button onClick={fetchApplications}>Retry</button>
          </div>
        )}

        {/* ── NGO VIEW — GROUPED ── */}
        {!loading && !error && user?.role === "ngo" && (
          filteredGroups.length === 0 ? (
            <div className="empty-state">
              <Users size={36} />
              <p>{search ? `No results for "${search}"` : "No applications yet"}</p>
              <span>Applications from volunteers will appear here</span>
            </div>
          ) : (
            filteredGroups.map(({ opportunity, apps }) => {

              const isOpen         = !!openGroups[opportunity._id];
              const pending        = apps.filter(a => a.status === "pending").length;
              const acceptedCount  = apps.filter(a => a.status === "accepted").length;
              const neededCount    = opportunity.volunteersNeeded || 1;
              const isFull         = acceptedCount >= neededCount;
              const fillPct        = Math.min(100,
                Math.round((acceptedCount / neededCount) * 100)
              );

              return (
                <div key={opportunity._id} className="opp-group">

                  {/* OPPORTUNITY HEADER */}
                  <div
                    className={`opp-group-header ${isOpen ? "open" : ""}`}
                    onClick={() => toggleGroup(opportunity._id)}
                  >
                    <div className="opp-group-left">
                      <div className="opp-group-icon">
                        <Briefcase size={18} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p className="opp-group-title">{opportunity.title}</p>
                        <div className="opp-group-meta">
                          <span className="opp-group-count">
                            <Users size={11} />
                            {apps.length} applicant{apps.length !== 1 ? "s" : ""}
                          </span>
                          <span className={`opp-group-status ${opportunity.status}`}>
                            {opportunity.status}
                          </span>
                          {isFull && (
                            <span className="opp-full-badge">
                              Full
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="opp-group-right">

                      {/* SPOTS TRACKER */}
                      <div className="opp-spots-tracker">
                        <div className="opp-spots-bar-track">
                          <div
                            className="opp-spots-bar-fill"
                            style={{
                              width:      `${fillPct}%`,
                              background: isFull ? "#e03131" : "#1D9E75",
                            }}
                          />
                        </div>
                        <span className={`opp-spots-text ${isFull ? "full" : ""}`}>
                          {acceptedCount} / {neededCount} accepted
                        </span>
                      </div>

                      {pending > 0 && (
                        <span className="opp-pending-badge">
                          {pending} pending
                        </span>
                      )}

                      <ChevronDown
                        size={16}
                        className={`opp-chevron ${isOpen ? "open" : ""}`}
                      />
                    </div>
                  </div>

                  {/* VOLUNTEER ROWS */}
                  {isOpen && (
                    <div className="opp-vol-list">
                      {apps.map(app => {
                        const match = computeMatch(
                          app.volunteer?.skills,
                          opportunity.requiredSkills
                        );
                        const cls = matchClass(match.pct);

                        return (
                          <div
                            key={app._id}
                            className="vol-row"
                            onClick={e => openModal(e, { ...app, opportunity })}
                          >
                            {/* AVATAR */}
                            <div className="vol-row-avatar">
                              {app.volunteer?.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>

                            {/* INFO */}
                            <div className="vol-row-info">
                              <p className="vol-row-name">
                                {app.volunteer?.name || "Unknown"}
                              </p>
                              <div className="vol-row-skills">
                                {app.volunteer?.skills?.length > 0 ? (
                                  app.volunteer.skills.slice(0, 4).map((s, i) => {
                                    const isMatched = opportunity.requiredSkills
                                      ?.map(r => r.toLowerCase())
                                      .includes(s.toLowerCase());
                                    return (
                                      <span
                                        key={i}
                                        className={`vol-row-skill ${isMatched ? "matched" : ""}`}
                                      >
                                        {s}
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="vol-row-no-skills">
                                    No skills listed
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* MATCH RING */}
                            {opportunity.requiredSkills?.length > 0 && (
                              <div className="vol-row-match">
                                <div className={`match-ring ${cls}`}>
                                  {match.pct}%
                                </div>
                                <span className="match-ring-label">match</span>
                              </div>
                            )}

                            {/* STATUS / ACTIONS */}
                            <div className="vol-row-status">
                              {app.status === "pending" ? (
                                <div
                                  className="vol-row-actions"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <button
                                    className="btn-accept"
                                    onClick={e => updateStatus(e, app._id, "accepted")}
                                  >
                                    <Check size={12} /> Accept
                                  </button>
                                  <button
                                    className="btn-reject"
                                    onClick={e => updateStatus(e, app._id, "rejected")}
                                  >
                                    <X size={12} /> Reject
                                  </button>
                                </div>
                              ) : (
                                renderBadge(app.status)
                              )}
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })
          )
        )}

        {/* ── VOLUNTEER VIEW ── */}
        {!loading && !error && user?.role === "volunteer" && (
          applications.length === 0 ? (
            <div className="empty-state">
              <Briefcase size={36} />
              <p>No applications yet</p>
              <span>Browse opportunities and apply to get started</span>
            </div>
          ) : (
            <div className="vol-app-list">
              {applications
                .filter(app =>
                  !search.trim() ||
                  app.opportunity?.title
                    ?.toLowerCase()
                    .includes(search.toLowerCase())
                )
                .map(app => (
                  <div key={app._id} className="vol-app-card">
                    <div className="vol-app-icon">
                      <Briefcase size={18} />
                    </div>
                    <div className="vol-app-info">
                      <p className="vol-app-title">
                        {app.opportunity?.title || "—"}
                      </p>
                      <p className="vol-app-date">
                        <Clock size={11} />
                        Applied{" "}
                        {app.createdAt
                          ? new Date(app.createdAt).toLocaleDateString("en-GB", {
                              day: "numeric", month: "short", year: "numeric"
                            })
                          : "—"}
                      </p>
                    </div>
                    {renderBadge(app.status)}
                  </div>
                ))}
            </div>
          )
        )}

      </div>

      {/* ── VOLUNTEER DETAIL MODAL ── */}
      {showModal && selectedApp && (
        <div
          className="vol-modal-overlay"
          onClick={() => setShowModal(false)}
        >
          <div
            className="vol-modal-box"
            onClick={e => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="vol-modal-header">
              <h3>Volunteer Details</h3>
              <button
                className="vol-modal-close"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            {/* HERO */}
            <div className="vol-modal-hero">
              <div className="vol-modal-big-avatar">
                {selectedApp.volunteer?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div>
                <p className="vol-modal-name">{selectedApp.volunteer?.name}</p>
                <p className="vol-modal-email">{selectedApp.volunteer?.email}</p>
              </div>
            </div>

            {/* SKILL MATCH BREAKDOWN */}
            {selectedApp.opportunity?.requiredSkills?.length > 0 && modalMatch && (
              <div className="vol-match-breakdown">
                <div className="vmb-top">
                  <span className="vmb-label">
                    Skill match for this opportunity
                  </span>
                  <span className={`vmb-score ${matchClass(modalMatch.pct)}`}>
                    {modalMatch.pct}%
                  </span>
                </div>

                <div className="vmb-bar-track">
                  <div
                    className="vmb-bar-fill"
                    style={{
                      width:      `${modalMatch.pct}%`,
                      background: matchColor(modalMatch.pct),
                    }}
                  />
                </div>

                <div className="vmb-skills-row">
                  {selectedApp.opportunity.requiredSkills.map((skill, i) => {
                    const isMatched = selectedApp.volunteer?.skills
                      ?.map(s => s.toLowerCase())
                      .includes(skill.toLowerCase());
                    return (
                      <div key={i} className="vmb-skill-line">
                        <div className={`vmb-skill-dot ${isMatched ? "matched" : "missing"}`} />
                        <span className="vmb-skill-name">{skill}</span>
                        <span className={`vmb-skill-tag ${isMatched ? "matched" : "missing"}`}>
                          {isMatched ? "has it" : "missing"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ALL SKILLS */}
            {selectedApp.volunteer?.skills?.length > 0 && (
              <div className="vol-modal-section">
                <p className="vol-modal-section-label">All Skills</p>
                <div className="vol-modal-skills">
                  {selectedApp.volunteer.skills.map((s, i) => (
                    <span key={i} className="vol-skill-tag">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* ACTIONS */}
            {selectedApp.status === "pending" ? (
              <div className="vol-modal-actions">
                <button
                  className="btn-accept"
                  onClick={e => {
                    updateStatus(e, selectedApp._id, "accepted");
                    setShowModal(false);
                  }}
                >
                  <Check size={13} /> Accept
                </button>
                <button
                  className="btn-reject"
                  onClick={e => {
                    updateStatus(e, selectedApp._id, "rejected");
                    setShowModal(false);
                  }}
                >
                  <X size={13} /> Reject
                </button>
              </div>
            ) : (
              <div style={{ marginBottom: 4 }}>
                {renderBadge(selectedApp.status)}
              </div>
            )}

            <button
              className="vol-modal-close-btn"
              onClick={() => setShowModal(false)}
            >
              Close
            </button>

          </div>
        </div>
      )}

    </Layout>
  );
}

export default Applications;