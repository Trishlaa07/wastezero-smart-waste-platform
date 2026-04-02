import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Layout from "../components/Layout";
import axios from "axios";
import { Calendar, MapPin, Clock, Eye, Search, SlidersHorizontal, X, ChevronDown, Plus } from "lucide-react";
import { useSocket } from "../context/SocketContext";
import "../styles/Opportunities.css";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5001";
const CLOUD_NAME = "dxuxhzonb";

const getImageUrl = (image) => {
  if (!image) return "/no-image.png";
  if (image.startsWith("http")) return image;
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${image}`;
};

function Opportunities() {
  const navigate = useNavigate();
  const location = useLocation();
  const socket   = useSocket();

  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [showFilters, setShowFilters]     = useState(false);
  const [autoMatch, setAutoMatch]         = useState(true);

  const token = localStorage.getItem("token");

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user")); }
    catch { return null; }
  }, []);

  const isVolunteer = user?.role === "volunteer";

  const [search,       setSearch]       = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("search") || "";
  });
  const [matchFilter,  setMatchFilter]  = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy,       setSortBy]       = useState(isVolunteer ? "match" : "date");
  const [distFilter,   setDistFilter]   = useState(isVolunteer ? "50" : "all");

  const DISTANCE_OPTIONS = [
    { v: "50",  label: "Within 50 km"  },
    { v: "100", label: "Within 100 km" },
    { v: "150", label: "Within 150 km" },
    { v: "200", label: "Within 200 km" },
    { v: "all", label: "Any distance"  },
  ];

  useEffect(() => {
    if (!token || !isVolunteer) return;
    axios.get(`${API}/api/settings/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then(res => {
      const am = res.data.data?.autoMatch;
      if (am !== undefined) setAutoMatch(am);
    })
    .catch(() => {});
  }, [token, isVolunteer]);

  const timeAgo = (date) => {
    if (!date) return "";
    const diff  = Date.now() - new Date(date);
    const mins  = Math.floor(diff / 60000);
    if (mins < 1)  return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const fetchOpportunities = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      let url;

      if (user?.role === "ngo") {
        url = `${API}/api/opportunities/my`;
      } else if (user?.role === "volunteer") {
        if (!autoMatch) {
          url = `${API}/api/opportunities`;
        } else {
          url = distFilter === "all"
            ? `${API}/api/opportunities`
            : `${API}/api/opportunities/matched`;
        }
      } else {
        url = `${API}/api/opportunities`;
      }

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOpportunities(res.data);
    } catch (err) {
      console.log("Fetch Error:", err);
      setError("Failed to load opportunities. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [token, user?.role, distFilter, autoMatch]);

  useEffect(() => {
    if (token) fetchOpportunities();
  }, [fetchOpportunities]);

  useEffect(() => {
    if (!socket) return;
    const handleNew = (newOpp) => {
      if (user?.role === "ngo") return;
      setOpportunities(prev => {
        if (prev.find(o => o._id === newOpp._id)) return prev;
        return [newOpp, ...prev];
      });
    };
    socket.on("newOpportunity", handleNew);
    return () => socket.off("newOpportunity", handleNew);
  }, [socket, user?.role]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdated = (updated) => {
      setOpportunities(prev =>
        prev.map(o => o._id === updated._id ? { ...o, ...updated } : o)
      );
    };
    socket.on("opportunityUpdated", handleUpdated);
    return () => socket.off("opportunityUpdated", handleUpdated);
  }, [socket]);

  const filtered = useMemo(() => {
    let list = [...opportunities];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.title?.toLowerCase().includes(q)       ||
        o.description?.toLowerCase().includes(q) ||
        o.location?.toLowerCase().includes(q)    ||
        (o.skills || []).some(s => s.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "all")
      list = list.filter(o => o.status === statusFilter);

    if (isVolunteer && autoMatch && matchFilter !== "all") {
      list = list.filter(o => {
        const m = o.skillMatch || 0;
        if (matchFilter === "high")   return m >= 70;
        if (matchFilter === "medium") return m >= 40 && m < 70;
        if (matchFilter === "low")    return m < 40;
        return true;
      });
    }

    if (isVolunteer && distFilter !== "all") {
      const km = parseInt(distFilter);
      list = list.filter(o => o.distance === undefined || o.distance <= km);
    }

    list.sort((a, b) => {
      if (sortBy === "match" && autoMatch)  return (b.skillMatch || 0) - (a.skillMatch || 0);
      if (sortBy === "match" && !autoMatch) return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === "date")                return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === "date_asc")            return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === "distance")            return (a.distance ?? 9999) - (b.distance ?? 9999);
      return 0;
    });

    return list;
  }, [opportunities, search, statusFilter, matchFilter, distFilter, sortBy, isVolunteer, autoMatch]);

  const activeFilterCount = [
    search.trim()                       ? 1 : 0,
    matchFilter  !== "all"              ? 1 : 0,
    isVolunteer && distFilter !== "50"  ? 1 : 0,
    statusFilter !== "all"              ? 1 : 0,
    isVolunteer && sortBy !== "match"   ? 1 : 0,
    !isVolunteer && sortBy !== "date"   ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    setSearch("");
    setMatchFilter("all");
    setDistFilter(isVolunteer ? "50" : "all");
    setStatusFilter("all");
    setSortBy(isVolunteer ? "match" : "date");
  };

  return (
    <Layout>
      <div className="opportunities-container">

        {/* HEADER */}
        <div className="opportunity-header">
          <div>
            <h2>
              {user?.role === "ngo" ? "Manage My Opportunities" : "Volunteer Opportunities"}
            </h2>
            <p className="sub-text">
              {user?.role === "ngo"
                ? "Manage and monitor your NGO activities"
                : autoMatch
                  ? "Showing opportunities matched to your skills"
                  : "Showing all opportunities"}
            </p>
          </div>

          {isVolunteer && (
            <div className={`automatch-badge ${autoMatch ? "on" : "off"}`}>
              {autoMatch ? "🔥 Auto-match ON" : "All opportunities"}
            </div>
          )}

          {user?.role === "ngo" && (
            <button
              className="create-opp-btn"
              onClick={() => navigate("/create-opportunity")}
            >
              <Plus size={16} />
              Create Opportunity
            </button>
          )}
        </div>

        {/* SEARCH + FILTER BAR */}
        <div className="filter-bar">
          <div className="search-box">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Search by title, location or skill..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="clear-search" onClick={() => setSearch("")}>
                <X size={13} />
              </button>
            )}
          </div>

          <button
            className={`filter-toggle-btn ${showFilters ? "active" : ""}`}
            onClick={() => setShowFilters(v => !v)}
          >
            <SlidersHorizontal size={15} />
            Filters
            {activeFilterCount > 0 && (
              <span className="filter-badge">{activeFilterCount}</span>
            )}
            <ChevronDown size={13} className={`chevron ${showFilters ? "open" : ""}`} />
          </button>

          <div className="select-wrap">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              {isVolunteer && autoMatch && <option value="match">Sort: Best Match</option>}
              <option value="date">Sort: Newest</option>
              <option value="date_asc">Sort: Oldest</option>
              {isVolunteer && <option value="distance">Sort: Nearest</option>}
            </select>
          </div>
        </div>

        {/* FILTER PANEL */}
        {showFilters && (
          <div className="filter-panel">
            <div className="filter-group">
              <p className="filter-label">Status</p>
              <div className="filter-pills">
                {["all", "Open", "Closed"].map(v => (
                  <button
                    key={v}
                    className={`pill ${statusFilter === v ? "pill-active" : ""}`}
                    onClick={() => setStatusFilter(v)}
                  >
                    {v === "all" ? "All" : v}
                  </button>
                ))}
              </div>
            </div>

            {isVolunteer && autoMatch && (
              <div className="filter-group">
                <p className="filter-label">Skill Match</p>
                <div className="filter-pills">
                  {[
                    { v: "all",    label: "All"             },
                    { v: "high",   label: "High (70%+)"     },
                    { v: "medium", label: "Medium (40–69%)" },
                    { v: "low",    label: "Low (<40%)"      },
                  ].map(({ v, label }) => (
                    <button
                      key={v}
                      className={`pill ${matchFilter === v ? "pill-active" : ""}`}
                      onClick={() => setMatchFilter(v)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isVolunteer && (
              <div className="filter-group">
                <p className="filter-label">Distance</p>
                <div className="filter-pills">
                  {DISTANCE_OPTIONS.map(({ v, label }) => (
                    <button
                      key={v}
                      className={`pill ${distFilter === v ? "pill-active" : ""}`}
                      onClick={() => setDistFilter(v)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeFilterCount > 0 && (
              <button className="clear-all-btn" onClick={clearFilters}>
                <X size={13} /> Clear all filters
              </button>
            )}
          </div>
        )}

        {/* RESULTS COUNT */}
        {!loading && !error && (
          <p className="results-count">
            {filtered.length === opportunities.length
              ? `${opportunities.length} opportunit${opportunities.length !== 1 ? "ies" : "y"}`
              : `${filtered.length} of ${opportunities.length} opportunities`}
            {isVolunteer && distFilter === "all" && (
              <span className="results-scope"> · showing all locations</span>
            )}
          </p>
        )}

        {loading && <div className="loading-state">Loading opportunities...</div>}

        {error && (
          <div className="error-banner">
            {error}
            <button onClick={fetchOpportunities}>Retry</button>
          </div>
        )}

        {/* GRID */}
        {!loading && !error && (
          <div className="opportunity-grid">
            {filtered.length === 0 ? (
              <div className="no-results">
                <p>No opportunities match your filters.</p>
                {activeFilterCount > 0 && (
                  <button className="clear-all-btn" onClick={clearFilters}>Clear filters</button>
                )}
              </div>
            ) : (
              filtered.map((opp) => (
                <div key={opp._id} className="opportunity-card">
                  <img
                    src={getImageUrl(opp.image)}
                    alt="opportunity"
                    className="opportunity-image"
                    onError={(e) => { e.target.src = "/no-image.png"; }}
                  />

                  <span className={`status-badge ${opp.status}`}>{opp.status}</span>

                  <div className="card-content">
                    <h3>{opp.title}</h3>
                    <p className="description">{opp.description}</p>

                    <div className="card-meta">
                      <p><Calendar size={16} />{opp.date ? opp.date.slice(0, 10) : "Date not specified"}</p>
                      <p>
                        <MapPin size={16} />
                        {opp.location || "Location not specified"}
                        {opp.distance !== undefined && (
                          <> • {opp.distance === 0 ? "Near you" : `${opp.distance} km away`}</>
                        )}
                      </p>
                      <p><Clock size={16} />{opp.duration || "Flexible"}</p>
                      <p className="posted-date">Posted {timeAgo(opp.createdAt)}</p>
                    </div>

                    {isVolunteer && autoMatch && (
                      <>
                        <p className={`match-score ${opp.skillMatch === 0 ? "suggested" : ""}`}>
                          {opp.skillMatch === 0
                            ? "Suggested opportunity"
                            : `🔥 ${opp.skillMatch}% skill match`}
                        </p>
                        <div className="match-bar">
                          <div
                            className="match-fill"
                            style={{ width: `${opp.skillMatch || 10}%` }}
                          />
                        </div>
                      </>
                    )}

                    <button
                      className="view-btn"
                      disabled={opp.status === "Closed"}
                      onClick={() => navigate(`/opportunity/${opp._id}`)}
                    >
                      <Eye size={16} />
                      View Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Opportunities;
