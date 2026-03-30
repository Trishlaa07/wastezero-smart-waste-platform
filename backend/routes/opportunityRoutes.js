const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");

const {
  createOpportunity,
  getAllOpportunities,
  getSingleOpportunity,
  updateOpportunity,
  deleteOpportunity,
  getNGODashboardStats,
  getMyOpportunities,
  getMatchedOpportunities
} = require("../controllers/opportunityController");

const {
  verifyToken,
  authorizeRoles
} = require("../middleware/authMiddleware");


/* =====================================
   NGO DASHBOARD STATS
===================================== */
router.get(
  "/ngo/dashboard-stats",
  verifyToken,
  authorizeRoles("ngo"),
  getNGODashboardStats
);


/* =====================================
   GET NGO OWN OPPORTUNITIES
===================================== */
router.get(
  "/my",
  verifyToken,
  authorizeRoles("ngo"),
  getMyOpportunities
);


/* =====================================
   CREATE OPPORTUNITY
===================================== */
router.post(
  "/",
  verifyToken,
  authorizeRoles("admin", "ngo"),
  upload.single("image"),
  createOpportunity
);


/* =====================================
   GET ALL OPPORTUNITIES
===================================== */
router.get(
  "/",
  verifyToken,
  getAllOpportunities
);


/* =====================================
   UPDATE OPPORTUNITY
===================================== */
router.put(
  "/:id",
  verifyToken,
  authorizeRoles("ngo"),
  upload.single("image"),
  updateOpportunity
);


/* =====================================
   DELETE OPPORTUNITY
===================================== */
router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("ngo"),
  deleteOpportunity
);


/* =====================================
   GET SINGLE OPPORTUNITY
   (keep this LAST to avoid route conflicts)
===================================== */

router.get(
  "/matched",
  verifyToken,
  getMatchedOpportunities
);

router.get(
  "/:id",
  verifyToken,
  getSingleOpportunity
);



module.exports = router;