import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import axios from "axios";
import "../styles/CreateOpportunity.css";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

function CreateOpportunity() {
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
    volunteersNeeded: 1,
  });

  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState("");
  const [mapSearch,    setMapSearch]    = useState("");
  const [searching,    setSearching]    = useState(false);
  const [markerPos,    setMarkerPos]    = useState(null);
  const [locationNote, setLocationNote] = useState("");
  const [suggestions,  setSuggestions]  = useState([]);

  const mapRef      = useRef(null);
  const leafletMap  = useRef(null);
  const markerRef   = useRef(null);
  const searchTimer = useRef(null);

  /* ── Load Leaflet CSS + JS ── */
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

    loadLeaflet().then(() => initMap());

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  const initMap = () => {
    if (!mapRef.current || leafletMap.current) return;
    const L   = window.L;
    const map = L.map(mapRef.current, { zoomControl: true }).setView([20.5937, 78.9629], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    map.on("click", async (e) => {
      placeMarker(e.latlng.lat, e.latlng.lng);
      await reverseGeocode(e.latlng.lat, e.latlng.lng);
    });

    leafletMap.current = map;
  };

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
      formData.append("volunteersNeeded", form.volunteersNeeded);
      if (form.image)   formData.append("image", form.image);
      if (markerPos) {
        formData.append("lat", markerPos.lat);
        formData.append("lng", markerPos.lng);
      }

      await axios.post(`${API}/api/opportunities`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      navigate("/opportunities");
    } catch (err) {
      setError(err.response?.data?.message || "Error creating opportunity");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="create-container">
        <h2>Create Opportunity</h2>

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
            placeholder="How many volunteers?"
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
              placeholder="Enter number"
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

            {/* Map search */}
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

            {/* Map */}
            <div ref={mapRef} className="leaflet-map-container" />

            {/* Detected location note */}
            {locationNote && <div className="location-note">{locationNote}</div>}

            {/* Divider */}
            <div className="location-divider">or edit manually</div>

            {/* City / State / Country */}
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

          <button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create Opportunity"}
          </button>

        </form>
      </div>
    </Layout>
  );
}

export default CreateOpportunity;