import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import axios from "axios";
import "../styles/CreateOpportunity.css";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

function EditOpportunity() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const token    = localStorage.getItem("token");

  const [form, setForm] = useState({
    title:            "",
    description:      "",
    requiredSkills:   "",
    date:             "",
    durationValue:    "",
    durationType:     "Days",
    city:             "",
    state:            "",
    country:          "",
    image:            null,
    status:           "Open",
    volunteersNeeded: 1,
  });

  const [loading,      setLoading]      = useState(true);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState("");
  const [mapSearch,    setMapSearch]    = useState("");
  const [searching,    setSearching]    = useState(false);
  const [markerPos,    setMarkerPos]    = useState(null);
  const [locationNote, setLocationNote] = useState("");
  const [suggestions,  setSuggestions]  = useState([]);
  const [mapReady,     setMapReady]     = useState(false);
  const [initCoords,   setInitCoords]   = useState(null);

  const mapRef      = useRef(null);
  const leafletMap  = useRef(null);
  const markerRef   = useRef(null);
  const searchTimer = useRef(null);

  /* ── Load Leaflet ── */
  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id   = "leaflet-css";
      link.rel  = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const loadLeaflet = () =>
      new Promise((resolve) => {
        if (window.L) { resolve(); return; }
        const script  = document.createElement("script");
        script.src    = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = resolve;
        document.body.appendChild(script);
      });

    loadLeaflet().then(() => setMapReady(true));

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  /* ── Init map once Leaflet + data ready ── */
  useEffect(() => {
    if (!mapReady || loading || leafletMap.current || !mapRef.current) return;

    const L   = window.L;
    const lat = initCoords?.lat || 20.5937;
    const lng = initCoords?.lng || 78.9629;
    const zoom = initCoords ? 12 : 5;

    const map = L.map(mapRef.current, { zoomControl: true }).setView([lat, lng], zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    map.on("click", async (e) => {
      placeMarker(e.latlng.lat, e.latlng.lng);
      await reverseGeocode(e.latlng.lat, e.latlng.lng);
    });

    leafletMap.current = map;

    if (initCoords) placeMarker(initCoords.lat, initCoords.lng);
  }, [mapReady, loading]);

  const placeMarker = (lat, lng) => {
    const L = window.L;
    if (!leafletMap.current) return;
    if (markerRef.current) markerRef.current.remove();

    const icon = L.divIcon({
      className: "",
      html: `<div style="width:22px;height:22px;background:#1f7a6b;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
      iconAnchor: [11, 11],
    });

    markerRef.current = L.marker([lat, lng], { icon }).addTo(leafletMap.current);
    setMarkerPos({ lat, lng });
  };

  const reverseGeocode = async (lat, lng) => {
    setLocationNote("Detecting location...");
    try {
      const res  = await axios.get("https://nominatim.openstreetmap.org/reverse", {
        params: { lat, lon: lng, format: "json" },
        headers: { "User-Agent": "wastezero-app" },
      });
      const addr    = res.data.address || {};
      const city    = addr.city || addr.town || addr.village || addr.county || "";
      const state   = addr.state || "";
      const country = addr.country || "";
      setForm(prev => ({ ...prev, city, state, country }));
      setLocationNote(`📍 ${[city, state, country].filter(Boolean).join(", ")}`);
    } catch {
      setLocationNote("Could not detect location. Please fill manually.");
    }
  };

  /* ── Fetch existing opportunity ── */
  useEffect(() => {
    const fetchOpportunity = async () => {
      try {
        const res  = await axios.get(`${API}/api/opportunities/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.data;
        const durationParts    = data.duration?.split(" ") || ["", "Days"];
        const normalizedStatus = data.status?.toLowerCase() === "closed" ? "Closed" : "Open";

        let city    = data.city    || "";
        let state   = data.state   || "";
        let country = data.country || "";

        if (!city && !state && !country && data.location) {
          const parts = data.location.split(",").map(s => s.trim());
          city    = parts[0] || "";
          state   = parts[1] || "";
          country = parts[2] || "";
        }

        setForm({
          title:            data.title            || "",
          description:      data.description      || "",
          requiredSkills:   data.requiredSkills?.join(", ") || "",
          date:             data.date ? data.date.split("T")[0] : "",
          durationValue:    durationParts[0],
          durationType:     durationParts[1]      || "Days",
          city, state, country,
          image:            null,
          status:           normalizedStatus,
          volunteersNeeded: data.volunteersNeeded  || 1,
        });

        if (data.coordinates?.lat) {
          setInitCoords({ lat: data.coordinates.lat, lng: data.coordinates.lng });
          setLocationNote(`📍 ${[city, state, country].filter(Boolean).join(", ")}`);
        }

      } catch (err) {
        console.log("FETCH ERROR:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOpportunity();
  }, [id, token]);

  const handleMapSearchChange = (e) => {
    const q = e.target.value;
    setMapSearch(q);
    clearTimeout(searchTimer.current);
    if (!q.trim()) { setSuggestions([]); return; }

    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await axios.get("https://nominatim.openstreetmap.org/search", {
          params: { q, format: "json", limit: 5, addressdetails: 1 },
          headers: { "User-Agent": "wastezero-app" },
        });
        setSuggestions(res.data || []);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handleSuggestionClick = (item) => {
    const lat  = parseFloat(item.lat);
    const lng  = parseFloat(item.lon);
    const addr = item.address || {};
    const city    = addr.city || addr.town || addr.village || addr.county || "";
    const state   = addr.state || "";
    const country = addr.country || "";

    setForm(prev => ({ ...prev, city, state, country }));
    setLocationNote(`📍 ${[city, state, country].filter(Boolean).join(", ")}`);
    setMapSearch(item.display_name.split(",").slice(0, 2).join(","));
    setSuggestions([]);

    if (leafletMap.current) {
      leafletMap.current.setView([lat, lng], 12);
      placeMarker(lat, lng);
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "image") {
      setForm(prev => ({ ...prev, image: files[0] }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const finalDuration = `${form.durationValue} ${form.durationType}`;
      const location = [form.city, form.state, form.country].filter(Boolean).join(", ");

      const formData = new FormData();
      formData.append("title",            form.title);
      formData.append("description",      form.description);
      formData.append("requiredSkills",   JSON.stringify(
        form.requiredSkills.split(",").map(s => s.trim()).filter(Boolean)
      ));
      formData.append("duration",         finalDuration);
      formData.append("date",             form.date);
      formData.append("city",             form.city);
      formData.append("state",            form.state);
      formData.append("country",          form.country);
      formData.append("location",         location);
      formData.append("status",           form.status);
      formData.append("volunteersNeeded", form.volunteersNeeded);
      if (form.image)  formData.append("image", form.image);
      if (markerPos) {
        formData.append("lat", markerPos.lat);
        formData.append("lng", markerPos.lng);
      }

      await axios.put(`${API}/api/opportunities/${id}`, formData, {
        headers: {
          Authorization:  `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      navigate("/opportunities");
    } catch (err) {
      setError(err.response?.data?.message || "Error updating opportunity");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Layout><h2 style={{ padding: 40 }}>Loading...</h2></Layout>;

  return (
    <Layout>
      <div className="create-container">
        <h2>Edit Opportunity</h2>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>

          <input
            name="title"
            placeholder="Title"
            value={form.title}
            onChange={handleChange}
            required
            style={{ marginBottom: 18 }}
          />

          <textarea
            name="description"
            placeholder="Description"
            value={form.description}
            onChange={handleChange}
            required
            style={{ marginBottom: 18 }}
          />

          <input
            name="requiredSkills"
            placeholder="Required skills (comma separated)"
            value={form.requiredSkills}
            onChange={handleChange}
            style={{ marginBottom: 18 }}
          />

          <label>Volunteers needed</label>
          <input
            type="number"
            name="volunteersNeeded"
            value={form.volunteersNeeded}
            onChange={handleChange}
            min="1"
            required
            style={{ marginBottom: 18, marginTop: 6 }}
          />

          <label>Opportunity date</label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            required
            min={new Date().toISOString().split("T")[0]}
            style={{ marginBottom: 18, marginTop: 6 }}
          />

          <label>Duration</label>
          <div className="duration-group" style={{ marginBottom: 18, marginTop: 6 }}>
            <input
              type="number"
              name="durationValue"
              value={form.durationValue}
              min="1"
              onChange={handleChange}
              required
            />
            <select name="durationType" value={form.durationType} onChange={handleChange}>
              <option value="Days">Days</option>
              <option value="Hours">Hours</option>
            </select>
          </div>

          <div className="form-divider" />

          {/* ══ LOCATION SECTION ══ */}
          <div className="location-section">
            <p className="location-section-title">Location</p>
            <p className="location-section-subtitle">Search on the map or click to pin, then adjust the fields below</p>

            <div className="map-search-wrap">
              <input
                className="map-search-input"
                type="text"
                placeholder="Search a place..."
                value={mapSearch}
                onChange={handleMapSearchChange}
                autoComplete="off"
              />
              {searching && <span className="map-searching">Searching...</span>}
              {suggestions.length > 0 && (
                <div className="map-suggestions">
                  {suggestions.map((s, i) => (
                    <div key={i} className="map-suggestion-item" onClick={() => handleSuggestionClick(s)}>
                      {s.display_name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="map-hint">Or click directly on the map to pin the location</p>

            <div ref={mapRef} className="leaflet-map-container" />

            {locationNote && <div className="location-note">{locationNote}</div>}

            <div className="location-divider">or edit manually</div>

            <div className="location-group">
              <input name="city"    placeholder="City"             value={form.city}    onChange={handleChange} required />
              <input name="state"   placeholder="State / Province" value={form.state}   onChange={handleChange} required />
              <input name="country" placeholder="Country"          value={form.country} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-divider" />

          <label>Image</label>
          <input
            type="file"
            name="image"
            onChange={handleChange}
            style={{ marginTop: 6, marginBottom: 18 }}
          />

          <label>Status</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            style={{ marginTop: 6, marginBottom: 18 }}
          >
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
          </select>

          <button type="submit" disabled={submitting}>
            {submitting ? "Updating..." : "Update Opportunity"}
          </button>

        </form>
      </div>
    </Layout>
  );
}

export default EditOpportunity;