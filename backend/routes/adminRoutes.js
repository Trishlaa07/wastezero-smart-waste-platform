const express = require("express");
const router  = express.Router();

const {
  getAllUsers,
  getUserWithStats,
  suspendUser,
  getAdminStats,
  getAllPosts,
  reportPost,
  deletePost,
  getAllReports,
} = require("../controllers/adminController");

const {
  verifyToken,
  authorizeRoles
} = require("../middleware/authMiddleware");

const adminOnly = [verifyToken, authorizeRoles("admin")];

router.get("/users",               ...adminOnly, getAllUsers);
router.get("/users/:id",           ...adminOnly, getUserWithStats);
router.put("/suspend/:id",         ...adminOnly, suspendUser);
router.get("/stats",               ...adminOnly, getAdminStats);
router.get("/posts",               ...adminOnly, getAllPosts);
router.put("/posts/:id/report",    ...adminOnly, reportPost);
router.delete("/posts/:id",        ...adminOnly, deletePost);
router.get("/reports",             ...adminOnly, getAllReports);

module.exports = router;