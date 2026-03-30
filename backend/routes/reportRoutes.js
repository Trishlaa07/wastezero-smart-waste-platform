const express = require("express");
const router  = express.Router();

const {
  createReport,
  createUserReport,
  getAllReports,
  getAllUserReports,
  resolveReport,
  dismissReport,
  resolveUserReport,
  dismissUserReport,
} = require("../controllers/reportController");

const {
  verifyToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const adminOnly = [verifyToken, authorizeRoles("admin")];

/* ── Opportunity reports ── */
router.post("/",               verifyToken,  createReport);
router.get("/",                ...adminOnly, getAllReports);
router.put("/:id/resolve",     ...adminOnly, resolveReport);
router.put("/:id/dismiss",     ...adminOnly, dismissReport);

/* ── User reports ── */
router.post("/user",               verifyToken,  createUserReport);
router.get("/user",                ...adminOnly, getAllUserReports);
router.put("/user/:id/resolve",    ...adminOnly, resolveUserReport);
router.put("/user/:id/dismiss",    ...adminOnly, dismissUserReport);

module.exports = router;