import Layout from "../../components/Layout";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useSocket } from "../../context/SocketContext";
import {
  Package, MapPin, Calendar, User,
  MoreVertical, Search, X, RefreshCw,
} from "lucide-react";
import "../../styles/ManagePickups.css";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

const STATUS_OPTIONS = ["all", "pending", "accepted", "in-transit", "completed", "cancelled"];

function StatusPill({ status }) {
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
      padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color, textTransform: "capitalize", whiteSpace: "nowrap",
    }}>
      {status}
    </span>
  );
}

function ManagePickups() {
  const token  = localStorage.getItem("token");
  const socket = useSocket();

  const [pickups,    setPickups]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [filter,     setFilter]     = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [updateModal, setUpdateModal] = useState({
    show: false, pickupId: null, status: "", weight: 0, assignedTo: "",
  });
  const [saveError,   setSaveError]   = useState("");
  const [saving,      setSaving]      = useState(false);

  // ── Fetch all pickups ──
  const fetchPickups = useCallback(async () => {
    setFetchError("");
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/pickups/ngo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPickups(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch pickups:", err);
      setFetchError(
        err?.response?.data?.message || "Failed to load pickups. Check your connection."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchPickups(); }, [fetchPickups]);

  // ── Real-time: new pickup ──
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

  // ── Save changes from modal ──
  const handleUpdateStatus = async () => {
    setSaveError("");
    setSaving(true);
    try {
      const res = await axios.put(
        `${API}/api/pickups/${updateModal.pickupId}/status`,
        {
          status:       updateModal.status,
          actualWeight: updateModal.weight,
          assignedTo:   updateModal.assignedTo,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state immediately (socket will also fire, deduplicated)
      setPickups(prev =>
        prev.map(p => p._id === updateModal.pickupId ? { ...p, ...res.data } : p)
      );
      setUpdateModal({ show: false, pickupId: null, status: "", weight: 0, assignedTo: "" });
    } catch (err) {
      setSaveError(err?.response?.data?.message || "Failed to update pickup. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const openModal = (p) =>
    setUpdateModal({
      show: true,
      pickupId:   p._id,
      status:     p.status,
      weight:     p.actualWeight || 0,
      assignedTo: p.assignedTo  || "",
    });

  const closeModal = () => {
    setUpdateModal({ show: false, pickupId: null, status: "", weight: 0, assignedTo: "" });
    setSaveError("");
  };

  // ── Filtered list ──
  const filtered = pickups.filter(p => {
    const matchStatus = filter === "all" || p.status === filter;
    const q = searchTerm.toLowerCase();
    const matchSearch =
      !q ||
      p.volunteer?.name?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q) ||
      p.wasteType?.toLowerCase().includes(q) ||
      p.address?.toLowerCase().includes(q) ||
      p.assignedTo?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // ── Stats ──
  const stats = [
    { label: "Total",      value: pickups.length,                                           color: "#1f7a6b" },
    { label: "Pending",    value: pickups.filter(p => p.status === "pending").length,        color: "#b45309" },
    { label: "In Transit", value: pickups.filter(p => p.status === "in-transit").length,     color: "#1d4ed8" },
    { label: "Completed",  value: pickups.filter(p => p.status === "completed").length,      color: "#374151" },
  ];

  return (
    <Layout>
      <div className="mp-page">

        {/* ── Header ── */}
        <div className="mp-header">
          <div>
            <h2 className="mp-title">Manage Pickups</h2>
            <p className="mp-sub">Track and coordinate all waste collection requests</p>
          </div>
          <button
            className="mp-clear-btn"
            onClick={fetchPickups}
            disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
            title="Refresh"
          >
            <RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        </div>

        {/* ── Fetch error banner ── */}
        {fetchError && (
          <div style={{
            background: "#fee2e2", color: "#991b1b", padding: "10px 16px",
            borderRadius: 8, marginBottom: 16, fontSize: 13,
          }}>
            {fetchError}
          </div>
        )}

        {/* ── Stats ── */}
        <div className="mp-stats-row">
          {stats.map(s => (
            <div key={s.label} className="mp-stat-card">
              <div className="mp-stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="mp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Filter bar ── */}
        <div className="mp-filter-bar">
          <div className="mp-search-box">
            <Search size={15} className="mp-search-icon" />
            <input
              type="text"
              placeholder="Search by volunteer, city, waste type, or agent…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="mp-clear-search" onClick={() => setSearchTerm("")}>
                <X size={13} />
              </button>
            )}
          </div>

          <div className="mp-status-pills">
            {STATUS_OPTIONS.map(v => (
              <button
                key={v}
                className={`mp-pill ${filter === v ? "mp-pill-active" : ""}`}
                onClick={() => setFilter(v)}
              >
                {v === "all" ? "All" : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ── Results count ── */}
        {!loading && !fetchError && (
          <p className="mp-results-count">
            {filtered.length === pickups.length
              ? `${pickups.length} pickup${pickups.length !== 1 ? "s" : ""}`
              : `${filtered.length} of ${pickups.length} pickups`}
          </p>
        )}

        {/* ── Loading ── */}
        {loading && <p className="mp-loading">Loading pickups…</p>}

        {/* ── Empty ── */}
        {!loading && !fetchError && filtered.length === 0 && (
          <div className="mp-empty">
            <Package size={44} style={{ color: "#d1d5db", marginBottom: 12 }} />
            <p>No pickup requests found.</p>
            {(searchTerm || filter !== "all") && (
              <button className="mp-clear-btn" onClick={() => { setSearchTerm(""); setFilter("all"); }}>
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* ── Grid ── */}
        {!loading && filtered.length > 0 && (
          <div className="mp-grid">
            {filtered.map(p => (
              <div key={p._id} className="mp-card">

                <div className="mp-card-header">
                  <StatusPill status={p.status} />
                  <button
                    className="mp-more-btn"
                    onClick={() => openModal(p)}
                    title="Update pickup"
                  >
                    <MoreVertical size={17} />
                  </button>
                </div>

                <div className="mp-waste-type">
                  <Package size={15} color="#1f7a6b" />
                  <span>{p.wasteType || "—"}</span>
                </div>

                <div className="mp-card-details">
                  <div className="mp-detail-row">
                    <Calendar size={14} color="#6b7280" />
                    <span>{p.pickupDate} at {p.timeSlot}</span>
                  </div>
                  <div className="mp-detail-row">
                    <MapPin size={14} color="#6b7280" />
                    <span>{p.address}, {p.city}</span>
                  </div>
                  <div className="mp-detail-row mp-card-divider">
                    <User size={14} color="#6b7280" />
                    <span>{p.volunteer?.name || "Volunteer"}</span>
                    {p.volunteer?.phone && (
                      <span className="mp-phone">{p.volunteer.phone}</span>
                    )}
                  </div>
                </div>

                {(p.assignedTo || p.actualWeight > 0) && (
                  <div className="mp-agent-box">
                    {p.assignedTo && (
                      <div><span className="mp-agent-label">Agent:</span> {p.assignedTo}</div>
                    )}
                    {p.actualWeight > 0 && (
                      <div><span className="mp-agent-label">Weight:</span> {p.actualWeight} kg</div>
                    )}
                  </div>
                )}

                {p.additionalNotes && (
                  <div style={{ fontSize: 12, color: "#6b7280", fontStyle: "italic", marginTop: 6 }}>
                    "{p.additionalNotes}"
                  </div>
                )}

                <button className="mp-update-btn" onClick={() => openModal(p)}>
                  Update Status
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Update Modal ── */}
        {updateModal.show && (
          <div className="mp-modal-overlay" onClick={closeModal}>
            <div className="mp-modal" onClick={e => e.stopPropagation()}>
              <div className="mp-modal-header">
                <h3>Update Pickup</h3>
                <button className="mp-modal-close" onClick={closeModal}>
                  <X size={18} />
                </button>
              </div>

              <div className="mp-modal-body">
                {saveError && (
                  <div style={{
                    background: "#fee2e2", color: "#991b1b", padding: "8px 12px",
                    borderRadius: 6, marginBottom: 12, fontSize: 13,
                  }}>
                    {saveError}
                  </div>
                )}

                <div className="mp-modal-field">
                  <label>Status</label>
                  <select
                    value={updateModal.status}
                    onChange={e => setUpdateModal(m => ({ ...m, status: e.target.value }))}
                  >
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="in-transit">In Transit</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="mp-modal-field">
                  <label>Assign Agent</label>
                  <input
                    type="text"
                    value={updateModal.assignedTo}
                    onChange={e => setUpdateModal(m => ({ ...m, assignedTo: e.target.value }))}
                    placeholder="Agent name"
                  />
                </div>

                <div className="mp-modal-field">
                  <label>Actual Weight (kg)</label>
                  <input
                    type="number"
                    value={updateModal.weight}
                    min={0}
                    step={0.1}
                    onChange={e =>
                      setUpdateModal(m => ({ ...m, weight: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>
              </div>

              <div className="mp-modal-footer">
                <button className="mp-cancel-btn" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
                <button className="mp-save-btn" onClick={handleUpdateStatus} disabled={saving}>
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}

export default ManagePickups;