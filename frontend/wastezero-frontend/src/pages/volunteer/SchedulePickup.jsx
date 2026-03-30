import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import axios from "axios";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

const TIME_SLOTS = [
  "08:00 - 10:00",
  "10:00 - 12:00",
  "12:00 - 14:00",
  "14:00 - 16:00",
  "16:00 - 18:00",
];

const WASTE_TYPES = [
  "Plastic",
  "Paper",
  "Glass",
  "Metal",
  "Electronic Waste",
  "Organic Waste",
];

// Mock agents — replace with real API data from your backend
const MOCK_AGENTS = [
  { id: 1, name: "Ravi Kumar",    area: "North Zone" },
  { id: 2, name: "Priya Sharma",  area: "South Zone" },
  { id: 3, name: "Anil Verma",    area: "East Zone"  },
  { id: 4, name: "Divya Nair",    area: "West Zone"  },
];

// ─── tiny inline styles (no extra CSS file needed) ───────────────────────────
const S = {
  page:        { padding: "24px 28px" },
  header:      { marginBottom: 24 },
  h2:          { fontSize: 22, fontWeight: 600, margin: 0 },
  sub:         { fontSize: 14, color: "#64748b", marginTop: 4 },

  tabs:        { display: "flex", borderBottom: "1px solid #e2e8f0", marginBottom: 24 },
  tab:         { padding: "10px 20px", fontSize: 14, fontWeight: 500, border: "none",
                 background: "none", cursor: "pointer", color: "#64748b",
                 borderBottom: "2px solid transparent" },
  tabActive:   { color: "#2563eb", borderBottom: "2px solid #2563eb" },

  cols:        { display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" },
  colForm:     { flex: "1 1 420px", minWidth: 0 },
  colRight:    { flex: "1 1 340px", minWidth: 0 },

  card:        { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8,
                 padding: "20px 24px", marginBottom: 16 },
  cardTitle:   { fontSize: 16, fontWeight: 600, margin: "0 0 4px" },
  cardSub:     { fontSize: 13, color: "#64748b", marginBottom: 18 },

  field:       { marginBottom: 16 },
  label:       { display: "block", fontSize: 13, fontWeight: 500,
                 color: "#374151", marginBottom: 6 },
  help:        { fontSize: 12, color: "#94a3b8", marginBottom: 8 },
  input:       { width: "100%", padding: "8px 12px", fontSize: 14,
                 border: "1px solid #d1d5db", borderRadius: 6, outline: "none",
                 boxSizing: "border-box" },
  select:      { width: "100%", padding: "8px 12px", fontSize: 14,
                 border: "1px solid #d1d5db", borderRadius: 6, outline: "none",
                 background: "#fff", boxSizing: "border-box" },
  textarea:    { width: "100%", padding: "8px 12px", fontSize: 14,
                 border: "1px solid #d1d5db", borderRadius: 6, outline: "none",
                 minHeight: 80, resize: "vertical", boxSizing: "border-box" },
  footnote:    { fontSize: 12, color: "#94a3b8", marginTop: 4 },

  row2:        { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },

  checkGrid:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  checkLabel:  { display: "flex", alignItems: "center", gap: 8, fontSize: 14,
                 color: "#374151", cursor: "pointer" },

  actRight:    { display: "flex", justifyContent: "flex-end", marginTop: 8 },
  actBetween:  { display: "flex", justifyContent: "space-between", marginTop: 8 },

  btnPrimary:  { padding: "8px 20px", background: "#2563eb", color: "#fff",
                 border: "none", borderRadius: 6, fontSize: 14, fontWeight: 500,
                 cursor: "pointer" },
  btnSecondary:{ padding: "8px 20px", background: "#fff", color: "#374151",
                 border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14,
                 fontWeight: 500, cursor: "pointer" },
  btnSm:       { padding: "6px 14px", background: "#2563eb", color: "#fff",
                 border: "none", borderRadius: 5, fontSize: 13, cursor: "pointer" },
  btnSmGray:   { padding: "6px 14px", background: "#f1f5f9", color: "#374151",
                 border: "1px solid #e2e8f0", borderRadius: 5, fontSize: 13,
                 cursor: "pointer" },

  error:       { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6,
                 padding: "10px 14px", fontSize: 13, color: "#dc2626", marginBottom: 12 },
  success:     { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6,
                 padding: "10px 14px", fontSize: 13, color: "#16a34a", marginBottom: 12 },

  // history items
  histItem:    { padding: "12px 0", borderBottom: "1px solid #f1f5f9",
                 display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  histDate:    { fontSize: 13, fontWeight: 500, color: "#1e293b" },
  histMeta:    { fontSize: 12, color: "#64748b", marginTop: 2 },
  histAddr:    { fontSize: 12, color: "#94a3b8", marginTop: 1 },

  // status pills
  pillPending:  { fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
                  background: "#fef9c3", color: "#854d0e" },
  pillAssigned: { fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
                  background: "#dcfce7", color: "#166534" },
  pillDone:     { fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
                  background: "#dbeafe", color: "#1e40af" },

  // NGO assign row
  assignRow:   { display: "flex", gap: 8, alignItems: "center", marginTop: 8 },
  assignSel:   { flex: 1, padding: "6px 10px", fontSize: 13,
                 border: "1px solid #d1d5db", borderRadius: 6, background: "#fff" },
  assignedTxt: { fontSize: 13, color: "#16a34a", fontWeight: 500 },

  // empty state
  emptyBox:    { textAlign: "center", padding: "32px 0" },
  emptyTxt:    { fontSize: 14, color: "#94a3b8", marginBottom: 12 },

  // step indicator
  stepBar:     { display: "flex", alignItems: "center", marginBottom: 20 },
  stepDot:     (active, done) => ({
                 width: 28, height: 28, borderRadius: "50%", display: "flex",
                 alignItems: "center", justifyContent: "center", fontSize: 13,
                 fontWeight: 600, flexShrink: 0,
                 background: done ? "#2563eb" : active ? "#2563eb" : "#e2e8f0",
                 color:      done ? "#fff"    : active ? "#fff"    : "#94a3b8",
               }),
  stepLine:    (done) => ({
                 flex: 1, height: 2, margin: "0 8px",
                 background: done ? "#2563eb" : "#e2e8f0",
               }),
  stepLbl:     (active) => ({
                 fontSize: 12, marginTop: 4, color: active ? "#2563eb" : "#94a3b8",
                 fontWeight: active ? 600 : 400,
               }),

  // section label
  sectionLbl:  { fontSize: 11, fontWeight: 600, letterSpacing: "0.07em",
                 color: "#94a3b8", textTransform: "uppercase", marginBottom: 10 },
};

// ─── helpers ─────────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  if (status === "assigned" || status === "accepted")
    return <span style={S.pillAssigned}>Assigned</span>;
  if (status === "completed")
    return <span style={S.pillDone}>Completed</span>;
  return <span style={S.pillPending}>Pending</span>;
}

// ─── Main component ───────────────────────────────────────────────────────────
function SchedulePickup() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user")); }
    catch { return null; }
  }, []);

  // role: "volunteer" or "ngo" — read from user object; fall back to "volunteer"
  const role = user?.role === "ngo" || user?.role === "admin" ? "ngo" : "volunteer";

  // ── shared state ──
  const [tab, setTab]     = useState(role === "ngo" ? "manage" : "new");
  const [step, setStep]   = useState(1);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── volunteer: pickup form ──
  const emptyForm = { address: "", city: "", pickupDate: "",
                      timeSlot: "", wasteTypes: [], additionalNotes: "" };
  const [form, setForm] = useState(emptyForm);

  // ── pickups list (volunteer sees own; NGO sees all pending) ──
  const [pickups, setPickups] = useState(() => {
    try { return JSON.parse(localStorage.getItem("wz_pickups") || "[]"); }
    catch { return []; }
  });

  // ── agents (NGO view) ──
  const [agents]       = useState(MOCK_AGENTS);
  const [agentSel, setAgentSel] = useState({}); // { [pickupId]: agentId }

  // persist demo state
  useEffect(() => {
    try { localStorage.setItem("wz_pickups", JSON.stringify(pickups)); }
    catch {}
  }, [pickups]);

  // fetch from backend if token exists
  useEffect(() => {
    if (!token) return;
    axios.get(`${API}/api/pickups`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { if (Array.isArray(res.data)) setPickups(res.data); })
      .catch(() => {});
  }, [token]);

  // ── volunteer: validation ──
  const canStep2 = () =>
    form.address.trim() && form.city.trim() && form.pickupDate && form.timeSlot;

  const goNext = () => {
    setError("");
    if (!canStep2()) {
      setError("Please fill in Address, City, Pickup Date, and Time Slot.");
      return;
    }
    setStep(2);
  };

  const toggleWasteType = (wt) =>
    setForm(prev => ({
      ...prev,
      wasteTypes: prev.wasteTypes.includes(wt)
        ? prev.wasteTypes.filter(x => x !== wt)
        : [...prev.wasteTypes, wt],
    }));

  const handleSubmit = async () => {
    setError("");
    if (!form.wasteTypes.length) {
      setError("Please select at least one waste type.");
      return;
    }
    setSubmitting(true);
    try {
      const entry = {
        id:         crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        createdAt:  new Date().toISOString(),
        ...form,
        status:     "pending",
        agentName:  null,
        userName:   user?.name || "Volunteer",
      };
      setPickups(prev => [entry, ...prev]);
      setNotice("Pickup scheduled! The NGO will assign an agent shortly.");
      setForm(emptyForm);
      setStep(1);
      setTab("history");

      // best-effort backend call
      if (token) {
        await axios.post(`${API}/api/pickups`, {
          address: form.address, city: form.city,
          pickupDate: form.pickupDate, timeSlot: form.timeSlot,
          wasteType: form.wasteTypes.join(", "),
          additionalNotes: form.additionalNotes,
        }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
      }
    } catch (e) {
      setError(e?.message || "Failed to schedule pickup.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── NGO: assign agent ──
  const assignAgent = async (pickupId) => {
    const agentId = agentSel[pickupId];
    if (!agentId) { setError("Please select an agent first."); return; }
    const agent = agents.find(a => a.id === Number(agentId));
    setPickups(prev =>
      prev.map(p => p.id === pickupId
        ? { ...p, status: "assigned", agentName: agent.name, agentArea: agent.area }
        : p)
    );
    setNotice(`Agent "${agent.name}" assigned successfully.`);
    setAgentSel(prev => { const n = { ...prev }; delete n[pickupId]; return n; });

    // best-effort backend
    if (token) {
      await axios.patch(`${API}/api/pickups/${pickupId}/assign`,
        { agentId },
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(() => {});
    }
  };

  // ── derived ──
  const myPickups      = pickups; // volunteer sees all own; NGO sees all
  const pendingPickups = pickups.filter(p => p.status === "pending");

  // auto-dismiss notice
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  // ── tabs config ──
  const volunteerTabs = [
    { key: "new",     label: "Schedule New Pickup" },
    { key: "history", label: "Pickup History"       },
  ];
  const ngoTabs = [
    { key: "manage",  label: "Manage Pickups"       },
    { key: "history", label: "All Pickup History"   },
  ];
  const tabs = role === "ngo" ? ngoTabs : volunteerTabs;

  return (
    <Layout>
      <div style={S.page}>

        {/* Header */}
        <div style={S.header}>
          <h2 style={S.h2}>Schedule Pickup</h2>
          <p style={S.sub}>
            {role === "ngo"
              ? "Review incoming requests and assign pickup agents"
              : "Request waste collection and manage your pickups"}
          </p>
        </div>

        {/* Notice / error banner */}
        {notice && <div style={S.success}>{notice}</div>}

        {/* Tabs */}
        <div style={S.tabs}>
          {tabs.map(t => (
            <button
              key={t.key}
              style={{ ...S.tab, ...(tab === t.key ? S.tabActive : {}) }}
              onClick={() => { setTab(t.key); setError(""); setStep(1); }}
            >
              {t.label}
              {t.key === "manage" && pendingPickups.length > 0 && (
                <span style={{
                  marginLeft: 6, background: "#2563eb", color: "#fff",
                  borderRadius: 99, fontSize: 11, padding: "1px 7px", fontWeight: 600,
                }}>
                  {pendingPickups.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════
            VOLUNTEER — New Pickup (2-step)
        ══════════════════════════════════════════ */}
        {tab === "new" && role === "volunteer" && (
          <div style={S.cols}>
            <div style={S.colForm}>
              <div style={S.card}>

                {/* Step indicator */}
                <div style={{ ...S.stepBar, marginBottom: 20 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={S.stepDot(step === 1, step > 1)}>1</div>
                    <span style={S.stepLbl(step === 1)}>Location & Time</span>
                  </div>
                  <div style={S.stepLine(step > 1)} />
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={S.stepDot(step === 2, false)}>2</div>
                    <span style={S.stepLbl(step === 2)}>Waste Details</span>
                  </div>
                </div>

                <div style={S.cardTitle}>
                  {step === 1 ? "Request Waste Collection" : "Waste Details"}
                </div>
                <p style={S.cardSub}>
                  {step === 1
                    ? "Fill in the details to schedule a pickup for your recyclable waste"
                    : "Select the type of waste and add any special instructions"}
                </p>

                {error && <div style={S.error}>{error}</div>}

                {/* ── Step 1 ── */}
                {step === 1 && (
                  <>
                    <div style={S.field}>
                      <label style={S.label}>Address</label>
                      <input
                        style={S.input}
                        value={form.address}
                        onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                        placeholder="Enter your street address"
                      />
                    </div>

                    <div style={S.row2}>
                      <div style={S.field}>
                        <label style={S.label}>City</label>
                        <input
                          style={S.input}
                          value={form.city}
                          onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                          placeholder="Your city"
                        />
                      </div>
                      <div style={S.field}>
                        <label style={S.label}>Pickup Date</label>
                        <input
                          style={S.input}
                          type="date"
                          value={form.pickupDate}
                          min={new Date().toISOString().split("T")[0]}
                          onChange={e => setForm(p => ({ ...p, pickupDate: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div style={S.field}>
                      <label style={S.label}>Preferred Time Slot</label>
                      <select
                        style={S.select}
                        value={form.timeSlot}
                        onChange={e => setForm(p => ({ ...p, timeSlot: e.target.value }))}
                      >
                        <option value="">Select a time slot</option>
                        {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>

                    <div style={S.actRight}>
                      <button style={S.btnPrimary} onClick={goNext}>
                        Next Step →
                      </button>
                    </div>
                  </>
                )}

                {/* ── Step 2 ── */}
                {step === 2 && (
                  <>
                    <div style={S.field}>
                      <label style={S.label}>Waste Types</label>
                      <p style={S.help}>Select all types that apply</p>
                      <div style={S.checkGrid}>
                        {WASTE_TYPES.map(wt => (
                          <label key={wt} style={S.checkLabel}>
                            <input
                              type="checkbox"
                              checked={form.wasteTypes.includes(wt)}
                              onChange={() => toggleWasteType(wt)}
                            />
                            {wt}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div style={S.field}>
                      <label style={S.label}>Additional Notes</label>
                      <p style={S.help}>
                        Any special instructions for the pickup team (access, packaging, etc.)
                      </p>
                      <textarea
                        style={S.textarea}
                        value={form.additionalNotes}
                        onChange={e => setForm(p => ({ ...p, additionalNotes: e.target.value }))}
                        placeholder="e.g. Gate code is 1234, bags are near the entrance…"
                      />
                      <p style={S.footnote}>Write "N/A" if no special instructions.</p>
                    </div>

                    <div style={S.actBetween}>
                      <button style={S.btnSecondary} onClick={() => setStep(1)} disabled={submitting}>
                        ← Previous
                      </button>
                      <button style={S.btnPrimary} onClick={handleSubmit} disabled={submitting}>
                        {submitting ? "Scheduling…" : "Schedule Pickup"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right: mini history preview */}
            <div style={S.colRight}>
              <div style={S.card}>
                <div style={S.cardTitle}>Recent Pickups</div>
                <p style={S.cardSub}>Your latest scheduled pickups</p>
                {myPickups.length === 0 ? (
                  <div style={S.emptyBox}>
                    <p style={S.emptyTxt}>No pickups yet.</p>
                  </div>
                ) : (
                  myPickups.slice(0, 4).map(p => (
                    <div key={p.id} style={S.histItem}>
                      <div>
                        <div style={S.histDate}>{p.pickupDate} · {p.timeSlot}</div>
                        <div style={S.histMeta}>
                          {Array.isArray(p.wasteTypes) ? p.wasteTypes.join(", ") : p.wasteType || "—"}
                          {" · "}{p.city}
                        </div>
                        <div style={S.histAddr}>{p.address}</div>
                      </div>
                      <StatusPill status={p.status} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            VOLUNTEER — Pickup History
        ══════════════════════════════════════════ */}
        {tab === "history" && role === "volunteer" && (
          <div style={S.card}>
            <div style={S.cardTitle}>Your Pickup History</div>
            <p style={S.cardSub}>View and manage all your scheduled pickups</p>

            {myPickups.length === 0 ? (
              <div style={S.emptyBox}>
                <p style={S.emptyTxt}>You haven't scheduled any pickups yet.</p>
                <button
                  style={S.btnPrimary}
                  onClick={() => { setTab("new"); setStep(1); }}
                >
                  Schedule your first pickup
                </button>
              </div>
            ) : (
              myPickups.map(p => (
                <div key={p.id} style={S.histItem}>
                  <div>
                    <div style={S.histDate}>{p.pickupDate} · {p.timeSlot}</div>
                    <div style={S.histMeta}>
                      {Array.isArray(p.wasteTypes) ? p.wasteTypes.join(", ") : p.wasteType || "—"}
                      {" · "}{p.city}
                    </div>
                    <div style={S.histAddr}>{p.address}</div>
                    {p.agentName && (
                      <div style={{ fontSize: 12, color: "#16a34a", marginTop: 2 }}>
                        Agent: {p.agentName}
                      </div>
                    )}
                  </div>
                  <StatusPill status={p.status} />
                </div>
              ))
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════
            NGO — Manage Pickups (assign agents)
        ══════════════════════════════════════════ */}
        {tab === "manage" && role === "ngo" && (
          <div>
            {/* Stats row */}
            <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
              {[
                { label: "Total Requests", value: pickups.length,        color: "#2563eb" },
                { label: "Pending",        value: pendingPickups.length,  color: "#b45309" },
                { label: "Assigned",       value: pickups.filter(p => p.status === "assigned").length, color: "#16a34a" },
                { label: "Agents Available", value: agents.length,       color: "#7c3aed" },
              ].map(s => (
                <div key={s.label} style={{
                  flex: "1 1 140px", background: "#fff",
                  border: "1px solid #e2e8f0", borderRadius: 8, padding: "16px 18px",
                }}>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {error && <div style={S.error}>{error}</div>}

            <div style={S.sectionLbl}>Pending requests</div>

            {pendingPickups.length === 0 ? (
              <div style={{ ...S.card, ...S.emptyBox }}>
                <p style={S.emptyTxt}>All pickups have been assigned.</p>
              </div>
            ) : (
              pendingPickups.map(p => (
                <div key={p.id} style={S.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b" }}>
                        {p.userName || "Volunteer"}
                      </div>
                      <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                        {p.pickupDate} · {p.timeSlot}
                      </div>
                      <div style={{ fontSize: 13, color: "#64748b" }}>
                        📍 {p.address}, {p.city}
                      </div>
                      <div style={{ fontSize: 13, color: "#64748b" }}>
                        🗑 {Array.isArray(p.wasteTypes) ? p.wasteTypes.join(", ") : p.wasteType || "—"}
                      </div>
                      {p.additionalNotes && (
                        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, fontStyle: "italic" }}>
                          "{p.additionalNotes}"
                        </div>
                      )}
                    </div>
                    <StatusPill status={p.status} />
                  </div>

                  {/* Assign agent row */}
                  <div style={S.assignRow}>
                    <select
                      style={S.assignSel}
                      value={agentSel[p.id] || ""}
                      onChange={e => setAgentSel(prev => ({ ...prev, [p.id]: e.target.value }))}
                    >
                      <option value="">Select an agent…</option>
                      {agents.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name} — {a.area}
                        </option>
                      ))}
                    </select>
                    <button style={S.btnSm} onClick={() => assignAgent(p.id)}>
                      Assign
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Already-assigned section */}
            {pickups.filter(p => p.status === "assigned").length > 0 && (
              <>
                <div style={{ ...S.sectionLbl, marginTop: 24 }}>Assigned pickups</div>
                {pickups.filter(p => p.status === "assigned").map(p => (
                  <div key={p.id} style={{ ...S.card, opacity: 0.85 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b" }}>
                          {p.userName || "Volunteer"}
                        </div>
                        <div style={{ fontSize: 13, color: "#64748b" }}>
                          {p.pickupDate} · {p.timeSlot} · {p.city}
                        </div>
                        <div style={S.assignedTxt}>✓ Agent: {p.agentName}</div>
                      </div>
                      <StatusPill status={p.status} />
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════
            NGO — All History
        ══════════════════════════════════════════ */}
        {tab === "history" && role === "ngo" && (
          <div style={S.card}>
            <div style={S.cardTitle}>All Pickup History</div>
            <p style={S.cardSub}>Complete log of all pickup requests on the platform</p>

            {pickups.length === 0 ? (
              <div style={S.emptyBox}>
                <p style={S.emptyTxt}>No pickups have been scheduled yet.</p>
              </div>
            ) : (
              pickups.map(p => (
                <div key={p.id} style={S.histItem}>
                  <div>
                    <div style={S.histDate}>
                      {p.userName || "Volunteer"} · {p.pickupDate} · {p.timeSlot}
                    </div>
                    <div style={S.histMeta}>
                      {Array.isArray(p.wasteTypes) ? p.wasteTypes.join(", ") : p.wasteType || "—"}
                      {" · "}{p.city}
                    </div>
                    <div style={S.histAddr}>{p.address}</div>
                    {p.agentName && (
                      <div style={{ fontSize: 12, color: "#16a34a", marginTop: 2 }}>
                        Agent: {p.agentName}
                      </div>
                    )}
                  </div>
                  <StatusPill status={p.status} />
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </Layout>
  );
}

export default SchedulePickup;