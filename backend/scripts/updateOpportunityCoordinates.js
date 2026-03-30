const mongoose = require("mongoose");
const axios = require("axios");
const Opportunity = require("../models/Opportunity");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI);

async function updateCoordinates() {

  const opportunities = await Opportunity.find({
    $or: [
      { "coordinates.lat": null },
      { "coordinates.lng": null }
    ]
  });

  console.log("Updating:", opportunities.length, "opportunities");

  for (const opp of opportunities) {

    if (!opp.location) continue;

    try {

      const geoRes = await axios.get(
        "https://nominatim.openstreetmap.org/search",
        {
          params: {
            q: opp.location,
            format: "json",
            limit: 1
          },
          headers: {
            "User-Agent": "wastezero-app"
          }
        }
      );

      if (geoRes.data.length > 0) {

        opp.coordinates = {
          lat: parseFloat(geoRes.data[0].lat),
          lng: parseFloat(geoRes.data[0].lon)
        };

        await opp.save();

        console.log("Updated:", opp.title);

      }

    } catch (err) {
      console.log("Error updating:", opp.title, "| location:", opp.location);
    }

  }

  console.log("Finished updating opportunities");
  process.exit();
}

updateCoordinates();