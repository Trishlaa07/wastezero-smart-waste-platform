import Layout from "../../components/Layout";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  TrendingUp, TrendingDown, Users, Briefcase,
  CheckCircle, XCircle, Flag, ShieldAlert, Activity, Download
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell
} from "recharts";
import "../../styles/reports.css";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

const pct = (a, b) => (b ? +((a / b) * 100).toFixed(1) : 0);
const fmt = (n)    => (n >= 1000 ? (n / 1000).toFixed(1) + "k" : (n ?? 0));

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun",
                     "Jul","Aug","Sep","Oct","Nov","Dec"];

/* ── CSV download ── */
function downloadCSV(stats, derived) {
  const { totalUsers, suspRate, closureRate, acceptRate, rejectRate, growthRate } = derived;
  const rows = [
    ["PLATFORM SUMMARY"],
    ["Metric", "Value"],
    ["Total Volunteers",        stats.totalUsers          ?? 0],
    ["Total NGOs",              stats.totalNGOs           ?? 0],
    ["Total Users",             totalUsers],
    ["Suspended Users",         stats.suspendedUsers      ?? 0],
    ["Suspension Rate (%)",     suspRate],
    ["Monthly Growth Rate (%)", growthRate],
    [],
    ["OPPORTUNITIES"],
    ["Metric", "Value"],
    ["Total Opportunities",     stats.totalOpportunities  ?? 0],
    ["Open Opportunities",      stats.openOpportunities   ?? 0],
    ["Closed Opportunities",    (stats.totalOpportunities ?? 0) - (stats.openOpportunities ?? 0)],
    ["Closure Rate (%)",        closureRate],
    [],
    ["APPLICATIONS"],
    ["Metric", "Value"],
    ["Total Applications",      stats.totalApplications    ?? 0],
    ["Accepted Applications",   stats.acceptedApplications ?? 0],
    ["Rejected Applications",   stats.rejectedApplications ?? 0],
    ["Acceptance Rate (%)",     acceptRate],
    ["Rejection Rate (%)",      rejectRate],
    [],
    ["REPORTS"],
    ["Metric", "Value"],
    ["Pending Reports",         stats.pendingReports   ?? 0],
    ["Resolved Reports",        stats.resolvedReports  ?? 0],
    ["Dismissed Reports",       stats.dismissedReports ?? 0],
    [],
    ["MONTHLY USER GROWTH"],
    ["Month", "New Users"],
    ...(stats.monthlyUsers?.map(m => [MONTH_NAMES[(m._id ?? 1) - 1], m.count]) || []),
    [],
    ["MONTHLY OPPORTUNITY CREATION"],
    ["Month", "Opportunities Created"],
    ...(stats.monthlyOpportunities?.map(m => [MONTH_NAMES[(m._id ?? 1) - 1], m.count]) || []),
  ];
  const csv  = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `analytics-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Stat tile ── */
function StatTile({ icon: Icon, label, value, sub, color, trend }) {
  const up = parseFloat(trend) >= 0;
  return (
    <div className="rp-stat-tile">
      <div className="rp-stat-top">
        <div className="rp-stat-icon" style={{ background: color + "18", color }}>
          <Icon size={16} />
        </div>
        {trend !== undefined && (
          <span className={`rp-trend-badge ${up ? "up" : "down"}`}>
            {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="rp-stat-value">{value}</p>
      <p className="rp-stat-label">{label}</p>
      {sub && <p className="rp-stat-sub">{sub}</p>}
    </div>
  );
}

/* ── Section card ── */
function Section({ title, subtitle, children }) {
  return (
    <div className="rp-section">
      <div className="rp-section-head">
        <p className="rp-section-title">{title}</p>
        {subtitle && <p className="rp-section-sub">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/* ── Custom tooltip ── */
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rp-tooltip">
      <p className="rp-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

/* ── Pie with legend ── */
function PieSection({ data }) {
  return (
    <div className="rp-pie-wrap">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} dataKey="value" cx="50%" cy="50%"
            innerRadius={50} outerRadius={80} paddingAngle={3}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip content={<ChartTip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="rp-pie-legend">
        {data.map((d, i) => (
          <div key={i} className="rp-pie-row">
            <span className="rp-pie-dot" style={{ background: d.color }} />
            <span>{d.name}</span>
            <span className="rp-pie-val">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Reports() {
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [downloading, setDownloading] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API}/api/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [token]);

  if (loading) return <Layout><p style={{ padding: 40, color: "#6b7280" }}>Loading analytics…</p></Layout>;
  if (!stats)  return null;

  /* ── derived ── */
  const totalUsers  = (stats.totalUsers  || 0) + (stats.totalNGOs || 0);
  const suspRate    = pct(stats.suspendedUsers       || 0, totalUsers);
  const closureRate = pct((stats.totalOpportunities  || 0) - (stats.openOpportunities || 0), stats.totalOpportunities || 0);
  const acceptRate  = pct(stats.acceptedApplications || 0, stats.totalApplications || 0);
  const rejectRate  = pct(stats.rejectedApplications || 0, stats.totalApplications || 0);

  const userCounts  = MONTH_NAMES.map((_, i) => stats.monthlyUsers?.find(m => m._id === i + 1)?.count || 0);
  const latestIdx   = [...userCounts].map((v,i) => v > 0 ? i : -1).filter(i => i >= 0).at(-1) ?? 0;
  const prevIdx     = latestIdx - 1;
  const growthRate  = prevIdx >= 0 && userCounts[prevIdx]
    ? +(((userCounts[latestIdx] - userCounts[prevIdx]) / userCounts[prevIdx]) * 100).toFixed(1)
    : 0;

  const derived = { totalUsers, suspRate, closureRate, acceptRate, rejectRate, growthRate };

  /* ── chart data ── */
  const monthlyData = MONTH_NAMES.map((name, i) => ({
    name,
    Volunteers:    stats.monthlyUsers?.find(m => m._id === i + 1)?.count         || 0,
    Opportunities: stats.monthlyOpportunities?.find(m => m._id === i + 1)?.count || 0,
  }));

  /* ── pie data ── */
  const reportPie = [
    { name: "Pending",   value: stats.pendingReports   || 0, color: "#f59e0b" },
    { name: "Resolved",  value: stats.resolvedReports  || 0, color: "#1D9E75" },
    { name: "Dismissed", value: stats.dismissedReports || 0, color: "#9ca3af" },
  ].filter(d => d.value > 0);

  const oppPie = [
    { name: "Open",   value: stats.openOpportunities || 0, color: "#1D9E75" },
    { name: "Closed", value: (stats.totalOpportunities || 0) - (stats.openOpportunities || 0), color: "#e03131" },
  ];

  const appPie = [
    { name: "Accepted", value: stats.acceptedApplications || 0, color: "#1D9E75" },
    { name: "Rejected", value: stats.rejectedApplications || 0, color: "#e03131" },
    { name: "Pending",  value: (stats.totalApplications || 0) - (stats.acceptedApplications || 0) - (stats.rejectedApplications || 0), color: "#f59e0b" },
  ].filter(d => d.value > 0);

  const totalReports = (stats.pendingReports || 0) + (stats.resolvedReports || 0) + (stats.dismissedReports || 0);

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => { downloadCSV(stats, derived); setDownloading(false); }, 300);
  };

  return (
    <Layout>
      <div className="rp-page">

        {/* HEADER */}
        <div className="rp-header">
          <div>
            <h2 className="rp-heading">Reports &amp; Analytics</h2>
            <p className="rp-head-sub">Detailed platform insights · auto-refreshes every 30s</p>
          </div>
          <button
            className={`rp-download-btn ${downloading ? "loading" : ""}`}
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download size={14} />
            {downloading ? "Preparing…" : "Download CSV"}
          </button>
        </div>

        {/* STAT TILES */}
        <div className="rp-stat-grid">
          <StatTile icon={Users}       label="Total users"     value={fmt(totalUsers)}                               color="#1D9E75" trend={growthRate} />
          <StatTile icon={TrendingUp}  label="Monthly growth"  value={`${growthRate > 0 ? "+" : ""}${growthRate}%`}  color="#059669" trend={growthRate} />
          <StatTile icon={CheckCircle} label="Acceptance rate" value={`${acceptRate}%`}                              color="#1976d2" sub={`${stats.acceptedApplications || 0} of ${stats.totalApplications || 0}`} />
          <StatTile icon={XCircle}     label="Rejection rate"  value={`${rejectRate}%`}                              color="#7c3aed" sub={`${stats.rejectedApplications  || 0} rejected`} />
          <StatTile icon={Briefcase}   label="Closure rate"    value={`${closureRate}%`}                             color="#f59e0b" sub={`${(stats.totalOpportunities || 0) - (stats.openOpportunities || 0)} closed`} />
          <StatTile icon={ShieldAlert} label="Suspension rate" value={`${suspRate}%`}                                color="#e03131" sub={`${stats.suspendedUsers || 0} suspended`} trend={-suspRate} />
          <StatTile icon={Flag}        label="Total reports"   value={totalReports}                                  color="#f59e0b" sub={`${stats.pendingReports || 0} pending`} />
          <StatTile icon={Activity}    label="Open opps"       value={stats.openOpportunities || 0}                  color="#059669" sub={`of ${stats.totalOpportunities || 0} total`} />
        </div>

        {/* ROW 1: Growth chart — full width */}
        <Section title="User &amp; Opportunity Growth" subtitle="Month-by-month across the year">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="gVol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1D9E75" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1D9E75" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gOpp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1976d2" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1976d2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} allowDecimals={false} />
              <Tooltip content={<ChartTip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="Volunteers"    stroke="#1D9E75" fill="url(#gVol)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="Opportunities" stroke="#1976d2" fill="url(#gOpp)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Section>

        {/* ROW 2: 3 equal pies */}
        <div className="rp-row-3">

          <Section title="Reports Status" subtitle="All report types combined">
            {reportPie.length === 0
              ? <p className="rp-empty">No reports yet</p>
              : <PieSection data={reportPie} />
            }
          </Section>

          <Section title="Opportunity Status" subtitle="Open vs closed">
            <PieSection data={oppPie} />
          </Section>

          <Section title="Application Breakdown" subtitle="Accepted, rejected, pending">
            {appPie.length === 0
              ? <p className="rp-empty">No applications yet</p>
              : <PieSection data={appPie} />
            }
          </Section>

        </div>

        {/* RISK MONITOR */}
        <Section title="Risk Monitor" subtitle="Automated flags based on live platform metrics">
          <div className="rp-risk-grid">

            <div className={`rp-risk-card ${suspRate > 15 ? "danger" : "safe"}`}>
              <ShieldAlert size={16} />
              <div>
                <p className="rp-risk-title">{suspRate > 15 ? "High suspension activity" : "Suspensions normal"}</p>
                <p className="rp-risk-desc">{suspRate}% of users suspended{suspRate > 15 ? " — review moderation rules" : " — within acceptable range"}</p>
              </div>
            </div>

            <div className={`rp-risk-card ${growthRate < 0 ? "warn" : "safe"}`}>
              <TrendingUp size={16} />
              <div>
                <p className="rp-risk-title">{growthRate < 0 ? "Negative user growth" : "User growth positive"}</p>
                <p className="rp-risk-desc">{growthRate > 0 ? "+" : ""}{growthRate}% month-on-month{growthRate < 0 ? " — investigate drop-off" : " — healthy trajectory"}</p>
              </div>
            </div>

            <div className={`rp-risk-card ${(stats.pendingReports || 0) > 10 ? "warn" : (stats.pendingReports || 0) > 0 ? "neutral" : "safe"}`}>
              <Flag size={16} />
              <div>
                <p className="rp-risk-title">
                  {(stats.pendingReports || 0) > 10 ? "High pending reports"
                    : (stats.pendingReports || 0) > 0 ? "Reports awaiting review"
                    : "No pending reports"}
                </p>
                <p className="rp-risk-desc">{stats.pendingReports || 0} pending · {stats.resolvedReports || 0} resolved · {stats.dismissedReports || 0} dismissed</p>
              </div>
            </div>

            <div className={`rp-risk-card ${acceptRate < 30 ? "warn" : "safe"}`}>
              <CheckCircle size={16} />
              <div>
                <p className="rp-risk-title">{acceptRate < 30 ? "Low acceptance rate" : "Acceptance rate healthy"}</p>
                <p className="rp-risk-desc">{acceptRate}% of applications accepted{acceptRate < 30 ? " — NGOs may be understaffed" : " — good volunteer engagement"}</p>
              </div>
            </div>

          </div>
        </Section>

      </div>
    </Layout>
  );
}