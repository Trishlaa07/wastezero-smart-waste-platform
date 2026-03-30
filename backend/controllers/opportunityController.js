const axios = require("axios");
const haversine = require("haversine-distance");
const User = require("../models/User");
const Opportunity = require("../models/Opportunity");
const Application = require("../models/Application");
const { createNotification } = require("./notificationController");
const fs = require("fs");
const path = require("path");

/* ==============================
   CREATE OPPORTUNITY
============================== */
exports.createOpportunity = async (req, res) => {
  try {
    const {
      title, description, requiredSkills, duration,
      city, state, country, location, date, volunteersNeeded,
      lat: bodyLat, lng: bodyLng   // ✅ from map picker if used
    } = req.body;

    let skillsArray = [];
    if (requiredSkills) {
      try { skillsArray = JSON.parse(requiredSkills); }
      catch { skillsArray = requiredSkills.split(","); }
    }

    const finalLocation = location ||
      [city, state, country].filter(Boolean).join(", ");

    let lat = bodyLat ? parseFloat(bodyLat) : null;
    let lng = bodyLng ? parseFloat(bodyLng) : null;

    // ✅ Only geocode if coordinates were NOT supplied by the map picker
    if (!lat && finalLocation) {
      try {
        const geoRes = await axios.get(
          "https://nominatim.openstreetmap.org/search",
          {
            params: { q: finalLocation, format: "json", limit: 1 },
            headers: { "User-Agent": "eco-connect-app" }
          }
        );
        if (geoRes.data.length > 0) {
          lat = parseFloat(geoRes.data[0].lat);
          lng = parseFloat(geoRes.data[0].lon);
        }
      } catch (geoError) {
        console.log("Geocoding Error:", geoError.message);
      }
    }

    const opportunity = await Opportunity.create({
      ngo:              req.user.id,
      title,
      description,
      requiredSkills:   skillsArray,
      duration,
      city:             city    || "",
      state:            state   || "",
      country:          country || "",
      location:         finalLocation,
      date,
      volunteersNeeded: volunteersNeeded || 1,
      coordinates:      { lat, lng },
      image:            req.file ? req.file.filename : "",
      isHidden:         false,
      reportCount:      0
    });

    /* NOTIFY ADMINS */
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await createNotification(
        admin._id,
        `New opportunity created: "${title}"`,
        "opportunity",
        opportunity._id,
        "Opportunity"
      );
    }

    /* NOTIFY MATCHED VOLUNTEERS within 50 km */
    if (lat && lng) {
      const volunteers = await User.find({
        role: "volunteer",
        "coordinates.lat": { $ne: null }
      });

      for (const volunteer of volunteers) {
        const distance = haversine(
          { lat, lon: lng },
          { lat: volunteer.coordinates.lat, lon: volunteer.coordinates.lng }
        ) / 1000;

        if (distance <= 50) {
          await createNotification(
            volunteer._id,
            `New opportunity near you: "${title}"`,
            "opportunity",
            opportunity._id,
            "Opportunity"
          );
        }
      }
    }

    if (global.io) global.io.emit("newOpportunity", opportunity);

    res.status(201).json({ message: "Opportunity created successfully", opportunity });

  } catch (error) {
    console.log("CREATE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/* ==============================
   GET ALL OPPORTUNITIES
============================== */
exports.getAllOpportunities = async (req, res) => {
  try {
    const opportunities = await Opportunity.find({
      $or: [{ isHidden: false }, { isHidden: { $exists: false } }]
    })
      .populate("ngo", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(opportunities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ==============================
   GET NGO OWN OPPORTUNITIES
============================== */
exports.getMyOpportunities = async (req, res) => {
  try {
    const opportunities = await Opportunity.find({ ngo: req.user.id })
      .populate("ngo", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(opportunities);
  } catch (error) {
    console.log("MY OPPORTUNITIES ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/* ==============================
   GET SINGLE OPPORTUNITY
============================== */
exports.getSingleOpportunity = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id)
      .populate("ngo", "name email");

    if (!opportunity || opportunity.isHidden) {
      return res.status(404).json({ message: "Opportunity not found" });
    }

    res.status(200).json(opportunity);
  } catch (error) {
    console.log("GET SINGLE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/* ==============================
   GET MATCHED OPPORTUNITIES
============================== */
exports.getMatchedOpportunities = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || !user.coordinates || !user.coordinates.lat) {
      return res.status(400).json({ message: "User location not set" });
    }

    const opportunities = await Opportunity.find({
      status: "Open",
      $or: [{ isHidden: false }, { isHidden: { $exists: false } }]
    });

    const userCoords = { lat: user.coordinates.lat, lon: user.coordinates.lng };
    const userSkills = (user.skills || []).map(s => s.toLowerCase());

    const matched = opportunities
      .map((opp) => {
        if (!opp.coordinates || !opp.coordinates.lat) return null;

        const oppCoords  = { lat: opp.coordinates.lat, lon: opp.coordinates.lng };
        const distance   = haversine(userCoords, oppCoords) / 1000;

        const oppSkills    = (opp.requiredSkills || []).map(s => s.toLowerCase());
        const commonSkills = oppSkills.filter(s => userSkills.includes(s));
        const skillMatch   = oppSkills.length > 0
          ? commonSkills.length / oppSkills.length : 0;

        const distanceScore = distance <= 50 ? (50 - distance) / 50 : 0;
        const totalScore    = (distanceScore * 0.5) + (skillMatch * 0.5);

        return {
          ...opp._doc,
          distance:   Number(distance.toFixed(2)),
          skillMatch: Math.round(skillMatch * 100),
          matchScore: totalScore
        };
      })
      .filter(Boolean)
      .filter(opp => opp.distance <= 50)
      .sort((a, b) => b.matchScore - a.matchScore);

    res.status(200).json(matched);
  } catch (error) {
    console.log("MATCH ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/* ==============================
   UPDATE OPPORTUNITY
============================== */
exports.updateOpportunity = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);

    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }

    if (opportunity.ngo.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You can update only your own opportunities"
      });
    }

    if (req.body.title)       opportunity.title       = req.body.title;
    if (req.body.description) opportunity.description = req.body.description;

    if (req.body.requiredSkills) {
      try { opportunity.requiredSkills = JSON.parse(req.body.requiredSkills); }
      catch { opportunity.requiredSkills = req.body.requiredSkills.split(","); }
    }

    if (req.body.duration)         opportunity.duration         = req.body.duration;
    if (req.body.date)             opportunity.date             = req.body.date;
    if (req.body.status)           opportunity.status           = req.body.status;
    if (req.body.volunteersNeeded) opportunity.volunteersNeeded = req.body.volunteersNeeded;
    if (req.file)                  opportunity.image            = req.file.filename;

    // ✅ Update location fields
    const newCity    = req.body.city    ?? opportunity.city;
    const newState   = req.body.state   ?? opportunity.state;
    const newCountry = req.body.country ?? opportunity.country;
    const newLocation = req.body.location ||
      [newCity, newState, newCountry].filter(Boolean).join(", ");

    const locationChanged = newLocation !== opportunity.location;

    opportunity.city     = newCity;
    opportunity.state    = newState;
    opportunity.country  = newCountry;
    opportunity.location = newLocation;

    // ✅ If map picker sent coordinates, use them directly
    if (req.body.lat && req.body.lng) {
      opportunity.coordinates = {
        lat: parseFloat(req.body.lat),
        lng: parseFloat(req.body.lng)
      };
    } else if (locationChanged && newLocation) {
      // Fallback: geocode from text if location changed without map
      try {
        const geoRes = await axios.get(
          "https://nominatim.openstreetmap.org/search",
          {
            params: { q: newLocation, format: "json", limit: 1 },
            headers: { "User-Agent": "eco-connect-app" }
          }
        );
        if (geoRes.data.length > 0) {
          opportunity.coordinates = {
            lat: parseFloat(geoRes.data[0].lat),
            lng: parseFloat(geoRes.data[0].lon)
          };
        }
      } catch (error) {
        console.log("Geocoding update error:", error.message);
      }
    }

    await opportunity.save();

    if (global.io) global.io.emit("opportunityUpdated", opportunity);

    res.status(200).json({ message: "Opportunity updated successfully", opportunity });

  } catch (error) {
    console.log("UPDATE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/* ==============================
   DELETE OPPORTUNITY
============================== */
exports.deleteOpportunity = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);

    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }

    if (opportunity.ngo.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You can delete only your own opportunities"
      });
    }

    if (opportunity.image) {
      const imagePath = path.join(__dirname, "../uploads", opportunity.image);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    await opportunity.deleteOne();

    if (global.io) global.io.emit("opportunityDeleted", { opportunityId: req.params.id });

    res.status(200).json({ message: "Opportunity deleted successfully" });

  } catch (error) {
    console.log("DELETE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/* ==============================
   NGO DASHBOARD STATS
============================== */
exports.getNGODashboardStats = async (req, res) => {
  try {
    const ngoId = req.user.id;

    const activeOpportunities = await Opportunity.countDocuments({ ngo: ngoId });
    const ngoOpportunities    = await Opportunity.find({ ngo: ngoId }).select("_id");
    const opportunityIds      = ngoOpportunities.map(op => op._id);

    const totalApplications = await Application.countDocuments({
      opportunity: { $in: opportunityIds }
    });

    res.status(200).json({
      activeOpportunities,
      pendingPickups:  0,
      messages:        0,
      totalApplications
    });

  } catch (error) {
    console.log("DASHBOARD ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};