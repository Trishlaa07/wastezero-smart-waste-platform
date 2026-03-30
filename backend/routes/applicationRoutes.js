const express = require("express");
const router = express.Router();

const {
  applyToOpportunity,
  getNGOApplications,
  updateApplicationStatus,
  checkIfApplied,
  getVolunteerApplications,
} = require("../controllers/applicationController");

const {
  verifyToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

/* Volunteer Apply */
router.post(
  "/apply",
  verifyToken,
  authorizeRoles("volunteer"),
  applyToOpportunity
);

/* NGO View Applications */
router.get(
  "/ngo",
  verifyToken,
  authorizeRoles("ngo"),
  getNGOApplications
);

/* NGO Accept / Reject */
router.put(
  "/:id",
  verifyToken,
  authorizeRoles("ngo"),
  updateApplicationStatus
);

/* Check if volunteer applied */
router.get(
  "/check/:opportunityId",
  verifyToken,
  authorizeRoles("volunteer"),
  checkIfApplied
);

/* Volunteer View Own Applications */
router.get(
  "/volunteer",
  verifyToken,
  authorizeRoles("volunteer"),
  getVolunteerApplications
);

module.exports = router;