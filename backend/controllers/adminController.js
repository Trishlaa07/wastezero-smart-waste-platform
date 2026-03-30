const User        = require("../models/User");
const Opportunity = require("../models/Opportunity");
const Application = require("../models/Application");
const Report      = require("../models/Report");
const { createNotification } = require("./notificationController");

/* ==============================
   GET ALL USERS
============================== */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: "admin" } })
      .select("-password -otp -otpExpiry -otpAttempts")
      .lean();

    const reportCounts = await Report.aggregate([
      {
        $match: {
          reportType: "user",
          status:     { $ne: "resolved" },
        }
      },
      {
        $group: {
          _id:   "$reportedUser",
          count: { $sum: 1 },
        }
      }
    ]);

    const reportCountMap = {};
    reportCounts.forEach(r => {
      reportCountMap[r._id.toString()] = r.count;
    });

    const updatedUsers = users.map(user => ({
      ...user,
      isSuspended: typeof user.isSuspended === "boolean"
        ? user.isSuspended
        : false,
      reportCount: reportCountMap[user._id.toString()] || 0,
    }));

    res.status(200).json(updatedUsers);

  } catch (error) {
    console.log("GET USERS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/* ==============================
   GET SINGLE USER WITH STATS
============================== */
exports.getUserWithStats = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password -otp -otpExpiry -otpAttempts")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const reportCount = await Report.countDocuments({
      reportedUser: user._id,
      reportType:   "user",
      status:       { $ne: "resolved" },
    });

    let stats = {};

    if (user.role === "ngo") {
      const opportunitiesCreated = await Opportunity.countDocuments({ ngo: user._id });
      const opportunities        = await Opportunity.find({ ngo: user._id }).select("_id");
      const opportunityIds       = opportunities.map(o => o._id);

      const totalApplications    = await Application.countDocuments({ opportunity: { $in: opportunityIds } });
      const acceptedApplications = await Application.countDocuments({ opportunity: { $in: opportunityIds }, status: "accepted" });

      const recentOpportunities  = await Opportunity.find({ ngo: user._id })
        .select("title status createdAt applicantCount")
        .sort({ createdAt: -1 })
        .limit(5);

      stats = { opportunitiesCreated, totalApplications, acceptedApplications, recentOpportunities };
    }

    if (user.role === "volunteer") {
      const applications = await Application.find({ volunteer: user._id })
        .populate("opportunity", "title status date location")
        .sort({ createdAt: -1 });

      stats = {
        totalApplied:        applications.length,
        accepted:            applications.filter(a => a.status === "accepted").length,
        pending:             applications.filter(a => a.status === "pending").length,
        rejected:            applications.filter(a => a.status === "rejected").length,
        recentApplications:  applications.slice(0, 5),
      };
    }

    res.status(200).json({ ...user, reportCount, stats });

  } catch (error) {
    console.log("GET USER STATS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/* ==============================
   SUSPEND / REACTIVATE USER
============================== */
exports.suspendUser = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.isSuspended) {
      user.isSuspended      = true;
      user.suspensionReason = reason || "Violation of platform rules";
      await createNotification(
        user._id,
        `Your account has been suspended. Reason: ${user.suspensionReason}`,
        "general"
      );
    } else {
      user.isSuspended      = false;
      user.suspensionReason = "";
      await createNotification(
        user._id,
        "Your account has been reactivated. Welcome back!",
        "general"
      );
    }

    await user.save();

    res.status(200).json({
      message: user.isSuspended ? "User suspended successfully" : "User reactivated successfully"
    });

  } catch (error) {
    console.log("SUSPEND ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/* ==============================
   ADMIN DASHBOARD STATS
   ✅ Now includes application counts
      and both opportunity + user report counts
============================== */
exports.getAdminStats = async (req, res) => {
  try {
    const totalUsers         = await User.countDocuments({ role: "volunteer" });
    const totalNGOs          = await User.countDocuments({ role: "ngo" });
    const totalOpportunities = await Opportunity.countDocuments();
    const openOpportunities  = await Opportunity.countDocuments({ status: "Open" });
    const suspendedUsers     = await User.countDocuments({ isSuspended: true });

    // ✅ Application counts for acceptance/rejection rate tiles
    const totalApplications    = await Application.countDocuments();
    const acceptedApplications = await Application.countDocuments({ status: "accepted" });
    const rejectedApplications = await Application.countDocuments({ status: "rejected" });

    // ✅ Both opportunity AND user reports for the pie chart
    const opportunityReports = await Report.countDocuments({ reportType: "opportunity" });
    const userReports        = await Report.countDocuments({ reportType: "user" });

    // ✅ Report status breakdown across both types
    const pendingReports   = await Report.countDocuments({ status: "pending" });
    const resolvedReports  = await Report.countDocuments({ status: "resolved" });
    const dismissedReports = await Report.countDocuments({ status: "reviewed" });

    const monthlyUsers = await User.aggregate([
      { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const monthlyOpportunities = await Opportunity.aggregate([
      { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      totalUsers,
      totalNGOs,
      totalOpportunities,
      openOpportunities,
      suspendedUsers,
      // ✅ New fields
      totalApplications,
      acceptedApplications,
      rejectedApplications,
      opportunityReports,
      userReports,
      pendingReports,
      resolvedReports,
      dismissedReports,
      monthlyUsers,
      monthlyOpportunities,
    });

  } catch (error) {
    console.log("ADMIN ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/* ==============================
   GET ALL POSTS (MODERATION)
============================== */
exports.getAllPosts = async (req, res) => {
  try {
    const posts = await Opportunity.find()
      .populate("ngo", "name role")
      .sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (error) {
    console.log("FETCH POSTS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/* ==============================
   REPORT POST
============================== */
exports.reportPost = async (req, res) => {
  try {
    const { reason } = req.body;
    const post = await Opportunity.findById(req.params.id);

    if (!post) return res.status(404).json({ message: "Post not found" });

    post.isReported   = true;
    post.reportReason = reason || "Reported by admin";
    await post.save();

    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await createNotification(admin._id, `Post "${post.title}" has been flagged`, "report", post._id, "Opportunity");
    }

    res.status(200).json({ message: "Post flagged successfully" });
  } catch (error) {
    console.log("REPORT ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/* ==============================
   DELETE POST + NOTIFY NGO
============================== */
exports.deletePost = async (req, res) => {
  try {
    const { reason } = req.body;
    const post = await Opportunity.findById(req.params.id);

    if (!post) return res.status(404).json({ message: "Post not found" });

    const ngoId     = post.ngo;
    const postTitle = post.title;

    await Opportunity.findByIdAndDelete(req.params.id);

    await createNotification(
      ngoId,
      `Your opportunity "${postTitle}" was removed by admin. Reason: ${reason || "Policy violation"}`,
      "post_deleted", null, null
    );

    if (global.io) global.io.emit("opportunityDeleted", { opportunityId: req.params.id });

    res.status(200).json({ message: "Post deleted and NGO notified" });
  } catch (error) {
    console.log("DELETE POST ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/* ==============================
   GET ALL REPORTS
============================== */
exports.getAllReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("reporter",    "name email")
      .populate("opportunity", "title")
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (err) {
    console.log("GET REPORTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};