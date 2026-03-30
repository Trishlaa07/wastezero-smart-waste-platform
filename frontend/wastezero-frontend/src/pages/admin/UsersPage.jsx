import Layout from "../../components/Layout";
import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { useSocket } from "../../context/SocketContext";
import { useLocation } from "react-router-dom";
import {
  Search, Eye, UserX, UserCheck,
  Mail, MapPin, Phone, Calendar, Award,
  Briefcase, ClipboardList, CheckCircle,
  Clock, XCircle, ShieldOff, Flag
} from "lucide-react";
import "../../styles/users.css";

const API            = import.meta.env.VITE_API_URL ?? "http://localhost:5001";
const SUSPEND_AT     = 5; // auto-suspend threshold — must match reportController

function UsersPage() {
  const token    = localStorage.getItem("token");
  const socket   = useSocket();
  const location = useLocation();

  const [users,         setUsers]         = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [search,        setSearch]        = useState("");
  const [roleFilter,    setRoleFilter]    = useState("all");
  const [statusFilter,  setStatusFilter]  = useState("all");

  const [selectedUser,  setSelectedUser]  = useState(null);
  const [userStats,     setUserStats]     = useState(null);
  const [loadingStats,  setLoadingStats]  = useState(false);
  const [showProfile,   setShowProfile]   = useState(false);
  const [showSuspend,   setShowSuspend]   = useState(false);
  const [reason,        setReason]        = useState("");
  const [suspendError,  setSuspendError]  = useState("");

  const [highlightedUserId, setHighlightedUserId] = useState(null);
  const highlightedRowRef = useRef(null);

  /* ── Fetch all users (now includes reportCount) ── */
  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
      setFilteredUsers(res.data);
    } catch (error) {
      console.log(error);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /* ── Handle highlight from notification navigation ── */
  useEffect(() => {
    const highlightUserId = location.state?.highlightUserId;
    if (!highlightUserId) return;

    setHighlightedUserId(highlightUserId);
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");

    const timer = setTimeout(() => setHighlightedUserId(null), 4000);
    return () => clearTimeout(timer);
  }, [location.state]);

  /* ── Scroll to highlighted row ── */
  useEffect(() => {
    if (!highlightedUserId || !highlightedRowRef.current) return;
    const timer = setTimeout(() => {
      highlightedRowRef.current?.scrollIntoView({
        behavior: "smooth",
        block:    "center",
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [highlightedUserId, filteredUsers]);

  /* ── Real-time: user auto-suspended ── */
  useEffect(() => {
    if (!socket) return;

    const handleAutoSuspend = ({ userId }) => {
      const suspensionReason = "Automatically suspended due to multiple user reports";
      setUsers(prev =>
        prev.map(u =>
          u._id === userId
            ? { ...u, isSuspended: true, suspensionReason, reportCount: SUSPEND_AT }
            : u
        )
      );
      setSelectedUser(prev =>
        prev?._id === userId
          ? { ...prev, isSuspended: true, suspensionReason }
          : prev
      );
    };

    socket.on("userAutoSuspended", handleAutoSuspend);
    return () => socket.off("userAutoSuspended", handleAutoSuspend);
  }, [socket]);

  /* ── Real-time: new user report — increment that user's count live ── */
  useEffect(() => {
    if (!socket) return;

    const handleNewUserReport = (report) => {
      const reportedId =
        typeof report.reportedUser === "object"
          ? report.reportedUser._id
          : report.reportedUser;

      setUsers(prev =>
        prev.map(u =>
          u._id === reportedId
            ? { ...u, reportCount: (u.reportCount || 0) + 1 }
            : u
        )
      );
    };

    socket.on("newUserReport", handleNewUserReport);
    return () => socket.off("newUserReport", handleNewUserReport);
  }, [socket]);

  /* ── Filter ── */
  useEffect(() => {
    let filtered = users;

    if (search) {
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(u =>
        statusFilter === "active" ? !u.isSuspended : u.isSuspended
      );
    }

    setFilteredUsers(filtered);
  }, [search, roleFilter, statusFilter, users]);

  /* ── Open profile ── */
  const openProfile = async (user) => {
    setSelectedUser(user);
    setUserStats(null);
    setShowProfile(true);
    setLoadingStats(true);

    try {
      const res = await axios.get(
        `${API}/api/admin/users/${user._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserStats(res.data.stats);
      // ✅ Also update reportCount from the detailed fetch
      setSelectedUser(prev => ({
        ...prev,
        reportCount: res.data.reportCount ?? prev.reportCount,
      }));
    } catch (err) {
      console.log("Stats fetch error:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  /* ── Suspend / reactivate ── */
  const openSuspend = (user) => {
    if (user.isSuspended) {
      handleSuspend(user._id, "");
    } else {
      setSelectedUser(user);
      setReason("");
      setSuspendError("");
      setShowSuspend(true);
    }
  };

  const handleSuspend = async (id, suspensionReason) => {
    try {
      await axios.put(
        `${API}/api/admin/suspend/${id}`,
        { reason: suspensionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowSuspend(false);
      setReason("");
      setSuspendError("");
      fetchUsers();

      if (selectedUser?._id === id) {
        setSelectedUser(prev => ({
          ...prev,
          isSuspended:      !prev.isSuspended,
          suspensionReason: suspensionReason,
        }));
      }
    } catch (error) {
      console.log(error);
    }
  };

  const confirmSuspend = () => {
    if (!reason.trim()) {
      setSuspendError("Please enter a suspension reason");
      return;
    }
    handleSuspend(selectedUser._id, reason);
  };

  /* ── Counts ── */
  const totalVolunteers = users.filter(u => u.role === "volunteer").length;
  const totalNGOs       = users.filter(u => u.role === "ngo").length;
  const totalSuspended  = users.filter(u => u.isSuspended).length;

  /* ── Report bar helper ── */
  const ReportBar = ({ count = 0, suspended }) => {
    if (suspended) return (
      <span className="report-bar-suspended">Suspended</span>
    );
    if (count === 0) return (
      <span className="report-bar-none">—</span>
    );
    const pct     = Math.min((count / SUSPEND_AT) * 100, 100);
    const danger  = count >= SUSPEND_AT - 1; // 4 or 5
    const warning = count >= 3;
    const color   = danger ? "#e03131" : warning ? "#f59e0b" : "#1D9E75";
    return (
      <div className="report-bar-wrapper">
        <div className="report-bar-track">
          <div
            className="report-bar-fill"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
        <span className="report-bar-label" style={{ color }}>
          <Flag size={10} /> {count}/{SUSPEND_AT}
        </span>
      </div>
    );
  };

  return (
    <Layout>
      <div className="users-container">

        {/* HEADER */}
        <div className="users-header">
          <div>
            <h2>Users Management</h2>
            <p>Manage volunteers and NGOs on the platform</p>
          </div>
          <div className="users-summary">
            <div className="summary-pill volunteer">
              {totalVolunteers} Volunteers
            </div>
            <div className="summary-pill ngo">
              {totalNGOs} NGOs
            </div>
            {totalSuspended > 0 && (
              <div className="summary-pill suspended">
                {totalSuspended} Suspended
              </div>
            )}
          </div>
        </div>

        {/* FILTERS */}
        <div className="users-filters">
          <div className="search-wrapper">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="ngo">NGO</option>
            <option value="volunteer">Volunteer</option>
          </select>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* TABLE */}
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Reports</th>  {/* ✅ new column */}
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="no-data">No users found</td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const isHighlighted = user._id === highlightedUserId;
                  return (
                    <tr
                      key={user._id}
                      ref={isHighlighted ? highlightedRowRef : null}
                      className={isHighlighted ? "user-row-highlighted" : ""}
                    >
                      <td>
                        <div className="user-cell">
                          <div className="user-cell-avatar">
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="user-cell-name">{user.name}</p>
                            <p className="user-cell-email">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={`role-pill ${user.role}`}>
                          {user.role}
                        </span>
                      </td>

                      <td>
                        <span className={`status ${user.isSuspended ? "suspended" : "active"}`}>
                          {user.isSuspended ? "Suspended" : "Active"}
                        </span>
                      </td>

                      {/* ✅ Report count column with progress bar */}
                      <td>
                        <ReportBar
                          count={user.reportCount || 0}
                          suspended={user.isSuspended}
                        />
                      </td>

                      <td className="joined-date">
                        {new Date(user.createdAt).toLocaleDateString("en-GB", {
                          day:   "numeric",
                          month: "short",
                          year:  "numeric",
                        })}
                      </td>

                      <td>
                        <div className="actions">
                          <button
                            className="action-view-btn"
                            onClick={() => openProfile(user)}
                          >
                            <Eye size={13} /> View
                          </button>

                          <button
                            className={user.isSuspended
                              ? "action-activate-btn"
                              : "action-suspend-btn"}
                            onClick={() => openSuspend(user)}
                          >
                            {user.isSuspended
                              ? <><UserCheck size={13} /> Activate</>
                              : <><UserX size={13} /> Suspend</>}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* ══ PROFILE MODAL ══ */}
      {showProfile && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowProfile(false)}>
          <div className="modal-box profile-modal-box" onClick={e => e.stopPropagation()}>

            <div className="modal-header">
              <h3>User Profile</h3>
              <button className="modal-close" onClick={() => setShowProfile(false)}>✕</button>
            </div>

            {/* HERO */}
            <div className="profile-hero">
              <div className={`profile-hero-avatar ${selectedUser.role}`}>
                {selectedUser.name?.charAt(0).toUpperCase()}
              </div>
              <div className="profile-hero-info">
                <h3>{selectedUser.name}</h3>
                <p className="profile-hero-email">
                  <Mail size={13} /> {selectedUser.email}
                </p>
                <div className="profile-hero-badges">
                  <span className={`role-pill ${selectedUser.role}`}>
                    {selectedUser.role}
                  </span>
                  <span className={`status ${selectedUser.isSuspended ? "suspended" : "active"}`}>
                    {selectedUser.isSuspended ? "Suspended" : "Active"}
                  </span>
                  {selectedUser.isVerified && (
                    <span className="verified-pill">
                      <CheckCircle size={11} /> Verified
                    </span>
                  )}
                  {/* ✅ Report count badge in profile header */}
                  {!selectedUser.isSuspended && (selectedUser.reportCount || 0) > 0 && (
                    <span className={`report-count-badge ${
                      (selectedUser.reportCount || 0) >= SUSPEND_AT - 1 ? "danger" :
                      (selectedUser.reportCount || 0) >= 3 ? "warning" : "normal"
                    }`}>
                      <Flag size={10} /> {selectedUser.reportCount}/{SUSPEND_AT} reports
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ACCOUNT INFO */}
            <div className="profile-section">
              <h4><Calendar size={14} /> Account Information</h4>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Joined</span>
                  <span className="info-value">
                    {new Date(selectedUser.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric", month: "long", year: "numeric"
                    })}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Verified</span>
                  <span className="info-value">
                    {selectedUser.isVerified ? "Yes" : "No"}
                  </span>
                </div>
                {selectedUser.phone && (
                  <div className="info-item">
                    <span className="info-label">Phone</span>
                    <span className="info-value">
                      <Phone size={12} /> {selectedUser.phone}
                    </span>
                  </div>
                )}
                {selectedUser.location && (
                  <div className="info-item">
                    <span className="info-label">Location</span>
                    <span className="info-value">
                      <MapPin size={12} /> {selectedUser.location}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* BIO */}
            {selectedUser.bio && (
              <div className="profile-section">
                <h4>About</h4>
                <p className="profile-bio">{selectedUser.bio}</p>
              </div>
            )}

            {/* SKILLS */}
            {selectedUser.skills?.length > 0 && (
              <div className="profile-section">
                <h4><Award size={14} /> Skills</h4>
                <div className="skills-list">
                  {selectedUser.skills.map((skill, i) => (
                    <span key={i} className="skill-badge">{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {/* STATS */}
            {loadingStats ? (
              <div className="profile-section">
                <p className="loading-stats">Loading activity...</p>
              </div>
            ) : userStats && (
              <>
                {selectedUser.role === "ngo" && (
                  <div className="profile-section">
                    <h4><Briefcase size={14} /> NGO Activity</h4>
                    <div className="stats-grid">
                      <div className="stat-card">
                        <span className="stat-number">{userStats.opportunitiesCreated}</span>
                        <span className="stat-label">Opportunities</span>
                      </div>
                      <div className="stat-card">
                        <span className="stat-number">{userStats.totalApplications}</span>
                        <span className="stat-label">Applications</span>
                      </div>
                      <div className="stat-card green">
                        <span className="stat-number">{userStats.acceptedApplications}</span>
                        <span className="stat-label">Accepted</span>
                      </div>
                    </div>
                    {userStats.recentOpportunities?.length > 0 && (
                      <>
                        <p className="recent-label">Recent Opportunities</p>
                        <div className="recent-list">
                          {userStats.recentOpportunities.map((opp, i) => (
                            <div key={i} className="recent-item">
                              <div>
                                <p className="recent-title">{opp.title}</p>
                                <p className="recent-meta">{opp.applicantCount || 0} applicants</p>
                              </div>
                              <span className={`status-mini ${opp.status?.toLowerCase()}`}>
                                {opp.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {selectedUser.role === "volunteer" && (
                  <div className="profile-section">
                    <h4><ClipboardList size={14} /> Volunteer Activity</h4>
                    <div className="stats-grid">
                      <div className="stat-card">
                        <span className="stat-number">{userStats.totalApplied}</span>
                        <span className="stat-label">Applied</span>
                      </div>
                      <div className="stat-card green">
                        <span className="stat-number">{userStats.accepted}</span>
                        <span className="stat-label">Accepted</span>
                      </div>
                      <div className="stat-card amber">
                        <span className="stat-number">{userStats.pending}</span>
                        <span className="stat-label">Pending</span>
                      </div>
                      <div className="stat-card red">
                        <span className="stat-number">{userStats.rejected}</span>
                        <span className="stat-label">Rejected</span>
                      </div>
                    </div>
                    {userStats.recentApplications?.length > 0 && (
                      <>
                        <p className="recent-label">Recent Applications</p>
                        <div className="recent-list">
                          {userStats.recentApplications.map((app, i) => (
                            <div key={i} className="recent-item">
                              <div>
                                <p className="recent-title">{app.opportunity?.title || "—"}</p>
                                <p className="recent-meta">
                                  <MapPin size={11} />{app.opportunity?.location || "—"}
                                </p>
                              </div>
                              <span className={`status-mini ${app.status}`}>
                                {app.status === "accepted" && <CheckCircle size={11} />}
                                {app.status === "pending"  && <Clock size={11} />}
                                {app.status === "rejected" && <XCircle size={11} />}
                                {app.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* SUSPENSION INFO */}
            {selectedUser.isSuspended && selectedUser.suspensionReason && (
              <div className="profile-section suspension-section">
                <h4><ShieldOff size={14} /> Suspension Reason</h4>
                <p className="suspension-reason">{selectedUser.suspensionReason}</p>
              </div>
            )}

            {/* FOOTER */}
            <div className="profile-modal-footer">
              <button
                className={selectedUser.isSuspended ? "footer-activate-btn" : "footer-suspend-btn"}
                onClick={() => { setShowProfile(false); openSuspend(selectedUser); }}
              >
                {selectedUser.isSuspended
                  ? <><UserCheck size={14} /> Activate Account</>
                  : <><UserX size={14} /> Suspend Account</>}
              </button>
              <button className="footer-close-btn" onClick={() => setShowProfile(false)}>
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ══ SUSPEND MODAL ══ */}
      {showSuspend && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowSuspend(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Suspend User</h3>
              <button className="modal-close" onClick={() => setShowSuspend(false)}>✕</button>
            </div>

            <div className="suspend-user-info">
              <div
                className={`profile-hero-avatar ${selectedUser.role}`}
                style={{ width: 40, height: 40, fontSize: 16 }}
              >
                {selectedUser.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ fontWeight: 600, margin: 0 }}>{selectedUser.name}</p>
                <p style={{ fontSize: 12, color: "#6c757d", margin: 0 }}>{selectedUser.email}</p>
              </div>
            </div>

            <p className="suspend-warning">
              This user will be notified and blocked from accessing the platform.
            </p>

            <textarea
              className="suspend-input"
              placeholder="Enter suspension reason (required)"
              value={reason}
              onChange={e => { setReason(e.target.value); setSuspendError(""); }}
            />

            {suspendError && <p className="suspend-error">{suspendError}</p>}

            <div className="modal-actions">
              <button className="cancel-modal-btn" onClick={() => setShowSuspend(false)}>
                Cancel
              </button>
              <button className="confirm-suspend-btn" onClick={confirmSuspend}>
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}

export default UsersPage;