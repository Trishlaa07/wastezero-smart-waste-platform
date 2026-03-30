import Layout from "../../components/Layout";
import { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import {
  Flag, Trash2, ShieldCheck, Eye,
  MapPin, AlertTriangle, Users
} from "lucide-react";
import { useSocket } from "../../context/SocketContext";
import "../../styles/moderation.css";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

function Moderation() {
  const socket = useSocket();
  const token  = localStorage.getItem("token");

  const [reports,         setReports]         = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [filter,          setFilter]          = useState("all");
  const [selectedGroup,   setSelectedGroup]   = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal,   setShowViewModal]   = useState(false);
  const [deleteReason,    setDeleteReason]    = useState("");
  const [deleteError,     setDeleteError]     = useState("");
  const [resolving,       setResolving]       = useState(false);

  /* ── Group reports by opportunity ── */
  const grouped = useMemo(() => {
    const map = {};
    reports.forEach(r => {
      const oppId = r.opportunity?._id;
      if (!oppId) return;
      if (!map[oppId]) {
        map[oppId] = {
          opportunity: r.opportunity,
          reports:     [],
        };
      }
      map[oppId].reports.push(r);
    });
    return Object.values(map).sort(
      (a, b) => b.reports.length - a.reports.length
    );
  }, [reports]);

  const filtered = useMemo(() => {
    if (filter === "pending")  return grouped.filter(g =>
      g.reports.some(r => r.status === "pending")
    );
    if (filter === "critical") return grouped.filter(g =>
      g.reports.length >= 3
    );
    if (filter === "hidden")   return grouped.filter(g =>
      g.opportunity?.isHidden
    );
    return grouped;
  }, [grouped, filter]);

  const pendingCount  = grouped.filter(g =>
    g.reports.some(r => r.status === "pending")
  ).length;

  const criticalCount = grouped.filter(g =>
    g.reports.length >= 3
  ).length;

  /* ── Fetch reports ── */
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(res.data);
    } catch (err) {
      console.log("Fetch reports error:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  /* ── Real-time: new report ── */
  useEffect(() => {
    if (!socket) return;
    const handleNewReport = (newReport) => {
      setReports(prev => {
        if (prev.find(r => r._id === newReport._id)) return prev;
        return [newReport, ...prev];
      });
    };
    socket.on("newReport", handleNewReport);
    return () => socket.off("newReport", handleNewReport);
  }, [socket]);

  /* ── Remove (resolve): delete the opportunity ── */
  const handleResolve = async () => {
    if (!deleteReason.trim()) {
      setDeleteError("Please enter a reason for removal");
      return;
    }
    setResolving(true);
    setDeleteError("");
    try {
      await axios.put(
        `${API}/api/reports/${selectedGroup.reports[0]._id}/resolve`,
        { reason: deleteReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowDeleteModal(false);
      setDeleteReason("");
      setSelectedGroup(null);
      fetchReports();
    } catch (err) {
      setDeleteError(
        err.response?.data?.message || "Error removing opportunity"
      );
    } finally {
      setResolving(false);
    }
  };

  /* ── Mark Safe (dismiss): keep opportunity, mark reports reviewed ── */
  const handleMarkSafe = async (reportId) => {
    try {
      await axios.put(
        `${API}/api/reports/${reportId}/dismiss`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchReports();
    } catch (err) {
      console.log("Mark safe error:", err);
    }
  };

  const tabs = [
    { key: "all",      label: "All" },
    { key: "pending",  label: "Pending",  badge: pendingCount },
    { key: "critical", label: "Critical", badge: criticalCount },
    { key: "hidden",   label: "Hidden" },
  ];

  return (
    <Layout>
      <div className="moderation-container">

        {/* HEADER */}
        <div className="moderation-header">
          <div>
            <h2>Content Moderation</h2>
            <p className="sub-text">
              Review reported opportunities and take action
            </p>
          </div>
          {pendingCount > 0 && (
            <div className="pending-alert">
              <AlertTriangle size={15} />
              {pendingCount} pending review{pendingCount > 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* FILTER TABS */}
        <div className="mod-tabs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`mod-tab ${filter === tab.key ? "active" : ""}`}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
              {tab.badge > 0 && (
                <span className="tab-badge">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        {loading ? (
          <p className="loading-text">Loading reports...</p>
        ) : filtered.length === 0 ? (
          <div className="empty-moderation">
            <Flag size={32} />
            <p>No reports to review</p>
          </div>
        ) : (
          <div className="moderation-grid">
            {filtered.map(({ opportunity, reports: oppReports }) => {

              const pendingReports  = oppReports.filter(r => r.status === "pending");
              const resolvedReports = oppReports.filter(r => r.status === "resolved");
              const reportCount     = oppReports.length;
              const isCritical      = reportCount >= 3;

              return (
                <div
                  key={opportunity._id}
                  className={`moderation-card ${isCritical ? "critical" : ""}`}
                >
                  {/* IMAGE */}
                  <div className="mod-image-wrapper">
                    <img
                      src={
                        opportunity.image
                          ? `${API}/uploads/${opportunity.image}`
                          : "/no-image.png"
                      }
                      alt="post"
                      className="moderation-image"
                    />

                    <div className={`report-count-badge ${isCritical ? "critical" : ""}`}>
                      <Flag size={11} />
                      {reportCount} report{reportCount > 1 ? "s" : ""}
                    </div>

                    {opportunity.isHidden && (
                      <div className="hidden-badge">Auto-hidden</div>
                    )}
                  </div>

                  <div className="card-content">
                    <h3>{opportunity.title}</h3>

                    <div className="card-meta">
                      <p><MapPin size={14} /> {opportunity.location || "—"}</p>
                    </div>

                    {/* REASON TAGS */}
                    <div className="report-reasons">
                      {oppReports.slice(0, 3).map((r, i) => (
                        <div key={i} className={`reason-tag ${r.status}`}>
                          {r.reason}
                        </div>
                      ))}
                      {oppReports.length > 3 && (
                        <div className="reason-tag more">
                          +{oppReports.length - 3} more
                        </div>
                      )}
                    </div>

                    {/* REPORTERS */}
                    <p className="reporters-text">
                      Reported by:{" "}
                      {oppReports
                        .slice(0, 2)
                        .map(r => r.reporter?.name)
                        .filter(Boolean)
                        .join(", ")}
                      {oppReports.length > 2 &&
                        ` +${oppReports.length - 2} more`}
                    </p>

                    {/* STATUS ROW */}
                    <div className="mod-status-row">
                      <span className={`status-pill ${
                        resolvedReports.length === oppReports.length
                          ? "resolved"
                          : pendingReports.length > 0
                          ? "pending"
                          : "reviewed"
                      }`}>
                        {resolvedReports.length === oppReports.length
                          ? "Resolved"
                          : pendingReports.length > 0
                          ? `${pendingReports.length} pending`
                          : "Reviewed"}
                      </span>

                      {isCritical && (
                        <span className="critical-pill">
                          <AlertTriangle size={11} /> High risk
                        </span>
                      )}
                    </div>

                    {/* ACTIONS */}
                    <div className="admin-actions">

                      <button
                        className="view-btn"
                        onClick={() => {
                          setSelectedGroup({ opportunity, reports: oppReports });
                          setShowViewModal(true);
                        }}
                      >
                        <Eye size={14} /> View
                      </button>

                      {pendingReports.length > 0 && (
                        <button
                          className="safe-btn"
                          onClick={() => handleMarkSafe(pendingReports[0]._id)}
                          title="Post is fine — clear the report"
                        >
                          <ShieldCheck size={14} /> Mark Safe
                        </button>
                      )}

                      <button
                        className="delete-btn"
                        onClick={() => {
                          setSelectedGroup({ opportunity, reports: oppReports });
                          setDeleteError("");
                          setDeleteReason("");
                          setShowDeleteModal(true);
                        }}
                      >
                        <Trash2 size={14} /> Remove
                      </button>

                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ══ VIEW MODAL ══ */}
      {showViewModal && selectedGroup && (
        <div
          className="modal-overlay"
          onClick={() => setShowViewModal(false)}
        >
          <div
            className="modal-box"
            onClick={e => e.stopPropagation()}
          >
            <h3>Report Details</h3>

            {/* OPPORTUNITY INFO */}
            <div className="view-modal-opp">
              {selectedGroup.opportunity?.image && (
                <img
                  src={`${API}/uploads/${selectedGroup.opportunity.image}`}
                  alt="opportunity"
                  className="view-modal-img"
                />
              )}
              <div className="view-modal-opp-info">
                <p className="vm-title">
                  {selectedGroup.opportunity?.title}
                </p>
                <p className="vm-location">
                  <MapPin size={13} />
                  {selectedGroup.opportunity?.location || "—"}
                </p>
                <div className="vm-meta-row">
                  <span className={`vm-status ${selectedGroup.opportunity?.isHidden ? "hidden" : "visible"}`}>
                    {selectedGroup.opportunity?.isHidden ? "Auto-hidden" : "Visible"}
                  </span>
                  <span className="vm-count">
                    <Flag size={11} />
                    {selectedGroup.reports.length} report{selectedGroup.reports.length > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* INDIVIDUAL REPORTS */}
            <p className="reports-section-label">Reports</p>

            <div className="all-reports-list">
              {selectedGroup.reports.map((r, i) => (
                <div key={i} className={`report-entry ${r.status}`}>

                  <div className="report-entry-top">
                    <div className="re-reporter">
                      <div className="re-avatar">
                        {r.reporter?.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="re-name">
                          {r.reporter?.name || "Unknown"}
                        </p>
                        <p className="re-email">{r.reporter?.email || "—"}</p>
                      </div>
                    </div>
                    <span className={`re-status ${r.status}`}>
                      {r.status}
                    </span>
                  </div>

                  <div className="re-body">
                    <span className="re-reason-tag">{r.reason}</span>
                    {r.description && (
                      <p className="re-desc">"{r.description}"</p>
                    )}
                    <p className="re-date">
                      {new Date(r.createdAt).toLocaleDateString("en-GB", {
                        day:   "numeric",
                        month: "short",
                        year:  "numeric",
                      })}
                    </p>
                  </div>

                </div>
              ))}
            </div>

            {/* MODAL ACTIONS */}
            <div className="modal-actions">
              {selectedGroup.reports.some(r => r.status === "pending") && (
                <button
                  className="safe-modal-btn"
                  onClick={() => {
                    const pending = selectedGroup.reports.find(
                      r => r.status === "pending"
                    );
                    if (pending) handleMarkSafe(pending._id);
                    setShowViewModal(false);
                  }}
                >
                  <ShieldCheck size={14} /> Mark Safe
                </button>
              )}
              <button
                className="close-modal-btn"
                onClick={() => setShowViewModal(false)}
                style={{ flex: 1 }}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ══ REMOVE MODAL ══ */}
      {showDeleteModal && selectedGroup && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowDeleteModal(false);
            setDeleteError("");
          }}
        >
          <div
            className="modal-box"
            onClick={e => e.stopPropagation()}
          >
            <h3>Remove Opportunity</h3>
            <p className="modal-sub">
              This will permanently delete{" "}
              <strong>"{selectedGroup.opportunity?.title}"</strong> and
              notify the NGO. This cannot be undone.
            </p>

            <textarea
              className="delete-reason-input"
              placeholder="Enter reason for removal (required)"
              value={deleteReason}
              onChange={e => {
                setDeleteReason(e.target.value);
                setDeleteError("");
              }}
            />

            {deleteError && (
              <p className="modal-error">{deleteError}</p>
            )}

            <div className="modal-actions">
              <button
                className="cancel-modal-btn"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteReason("");
                  setDeleteError("");
                }}
              >
                Cancel
              </button>
              <button
                className="delete-confirm-btn"
                onClick={handleResolve}
                disabled={resolving}
              >
                {resolving ? "Removing..." : "Confirm Remove"}
              </button>
            </div>

          </div>
        </div>
      )}

    </Layout>
  );
}

export default Moderation;