const Report      = require("../models/Report");
const Opportunity = require("../models/Opportunity");
const User        = require("../models/User");
const { createNotification } = require("./notificationController");

/* ==============================
   CREATE OPPORTUNITY REPORT
============================== */
exports.createReport = async (req, res) => {
  try {
    const { opportunityId, reason, description } = req.body;

    if (!reason) {
      return res.status(400).json({ message: "Reason is required" });
    }

    const opportunity = await Opportunity.findById(opportunityId);
    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }

    /* Prevent duplicate */
    const existingReport = await Report.findOne({
      reporter:    req.user.id,
      opportunity: opportunityId,
      reportType:  "opportunity",
    });

    if (existingReport) {
      return res.status(400).json({
        message: "You have already reported this opportunity"
      });
    }

    const report = await Report.create({
      reporter:    req.user.id,
      opportunity: opportunityId,
      reportType:  "opportunity",
      reason,
      description,
    });

    /* Increment report count */
    opportunity.reportCount += 1;
    opportunity.isReported   = true;

    /* Auto-hide at 3+ reports */
    if (opportunity.reportCount >= 3) {
      opportunity.isHidden     = true;
      opportunity.reportReason = "Hidden due to multiple reports";

      await createNotification(
        opportunity.ngo,
        `Your opportunity "${opportunity.title}" was automatically hidden due to multiple reports`,
        "post_deleted",
        opportunity._id,
        "Opportunity"
      );

      if (global.io) {
        global.io.emit("opportunityDeleted", {
          opportunityId: opportunity._id.toString()
        });
      }
    }

    await opportunity.save();

    /* Notify all admins */
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await createNotification(
        admin._id,
        `Opportunity "${opportunity.title}" was reported (${opportunity.reportCount} report${opportunity.reportCount > 1 ? "s" : ""})`,
        "report",
        opportunity._id,
        "Opportunity"
      );
    }

    if (global.io) {
      const populatedReport = await Report.findById(report._id)
        .populate("reporter",    "name email")
        .populate("opportunity", "title location reportCount isHidden status image ngo");
      global.io.emit("newReport", populatedReport);
    }

    res.status(201).json({ success: true, message: "Report submitted successfully" });

  } catch (err) {
    console.log("REPORT ERROR:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ==============================
   CREATE USER REPORT (from messages)
============================== */
exports.createUserReport = async (req, res) => {
  try {
    const { reportedUserId, reason, description } = req.body;

    if (!reason) {
      return res.status(400).json({ message: "Reason is required" });
    }

    if (!reportedUserId) {
      return res.status(400).json({ message: "Reported user is required" });
    }

    /* Cannot report yourself */
    if (reportedUserId === req.user.id) {
      return res.status(400).json({ message: "You cannot report yourself" });
    }

    const reportedUser = await User.findById(reportedUserId);
    if (!reportedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    /* Prevent duplicate */
    const existingReport = await Report.findOne({
      reporter:     req.user.id,
      reportedUser: reportedUserId,
      reportType:   "user",
    });

    if (existingReport) {
      return res.status(400).json({
        message: "You have already reported this user"
      });
    }

    const report = await Report.create({
      reporter:     req.user.id,
      reportedUser: reportedUserId,
      reportType:   "user",
      reason,
      description,
    });

    /* Count total reports against this user */
    const totalReports = await Report.countDocuments({
      reportedUser: reportedUserId,
      reportType:   "user",
      status:       { $ne: "resolved" },
    });

    console.log(`📊 TOTAL REPORTS for user ${reportedUserId}:`, totalReports);
    console.log(`🔍 User isSuspended:`, reportedUser.isSuspended);

    const SUSPEND_THRESHOLD = 5;

    if (totalReports >= SUSPEND_THRESHOLD && !reportedUser.isSuspended) {
      console.log("🔴 AUTO-SUSPENDING user:", reportedUser.name);

      reportedUser.isSuspended      = true;
      reportedUser.suspensionReason = "Automatically suspended due to multiple user reports";
      await reportedUser.save();

      /* Notify the suspended user */
      await createNotification(
        reportedUserId,
        "Your account has been suspended due to multiple reports from other users",
        "general"
      );

      /* Notify admins */
      const admins = await User.find({ role: "admin" });
      for (const admin of admins) {
        await createNotification(
          admin._id,
          `User "${reportedUser.name}" was automatically suspended after ${totalReports} report${totalReports > 1 ? "s" : ""}`,
          "report",
          reportedUser._id,
          "User"
        );
      }

      /* ✅ toString() ensures the ID is always a plain string on the client */
      if (global.io) {
        console.log("📡 EMITTING userAutoSuspended for userId:", reportedUser._id.toString());
        global.io.emit("userAutoSuspended", {
          userId: reportedUser._id.toString(),
          name:   reportedUser.name,
        });
      }

    } else {
      /* Notify admins about the new report */
      const admins = await User.find({ role: "admin" });
      for (const admin of admins) {
        await createNotification(
          admin._id,
          `User "${reportedUser.name}" was reported by a volunteer (${totalReports} report${totalReports > 1 ? "s" : ""})`,
          "report",
          reportedUser._id,
          "User"
        );
      }
    }

    /* Real-time push to admin */
    if (global.io) {
      const populatedReport = await Report.findById(report._id)
        .populate("reporter",     "name email")
        .populate("reportedUser", "name email role");
      global.io.emit("newUserReport", populatedReport);
    }

    res.status(201).json({
      success:       true,
      message:       "User reported successfully",
      autoSuspended: totalReports >= SUSPEND_THRESHOLD,
    });

  } catch (err) {
    console.log("USER REPORT ERROR:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ==============================
   GET ALL REPORTS (ADMIN)
============================== */
exports.getAllReports = async (req, res) => {
  try {
    const { type } = req.query;

    const filter = {};
    if (type) filter.reportType = type;

    const reports = await Report.find(filter)
      .populate("reporter",     "name email")
      .populate("opportunity",  "title location reportCount isHidden status image ngo")
      .populate("reportedUser", "name email role isSuspended")
      .sort({ createdAt: -1 });

    res.status(200).json(reports);
  } catch (err) {
    console.log("GET REPORTS ERROR:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ==============================
   GET USER REPORTS (ADMIN)
============================== */
exports.getAllUserReports = async (req, res) => {
  try {
    const reports = await Report.find({ reportType: "user" })
      .populate("reporter",     "name email")
      .populate("reportedUser", "name email role isSuspended suspensionReason")
      .sort({ createdAt: -1 });

    res.status(200).json(reports);
  } catch (err) {
    console.log("GET USER REPORTS ERROR:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ==============================
   RESOLVE REPORT — delete the opportunity
============================== */
exports.resolveReport = async (req, res) => {
  try {
    const { reason } = req.body;

    const report = await Report.findById(req.params.id)
      .populate("opportunity");

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    const opportunity = report.opportunity;

    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity already deleted" });
    }

    await Opportunity.findByIdAndDelete(opportunity._id);

    await Report.updateMany(
      { opportunity: opportunity._id },
      { status: "resolved" }
    );

    await createNotification(
      opportunity.ngo,
      `Your opportunity "${opportunity.title}" was removed after review. Reason: ${reason || "Policy violation"}`,
      "post_deleted",
      null,
      null
    );

    if (global.io) {
      global.io.emit("opportunityDeleted", {
        opportunityId: opportunity._id.toString()
      });
    }

    res.status(200).json({ message: "Opportunity removed and reports resolved" });

  } catch (err) {
    console.log("RESOLVE REPORT ERROR:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ==============================
   DISMISS REPORT — keep opportunity, mark reviewed
============================== */
exports.dismissReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate("opportunity");

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    report.status = "reviewed";
    await report.save();

    if (report.opportunity) {
      await Opportunity.findByIdAndUpdate(report.opportunity._id, {
        isHidden:   false,
        isReported: false,
      });

      if (global.io) {
        const restored = await Opportunity.findById(report.opportunity._id)
          .populate("ngo", "name email");
        global.io.emit("newOpportunity", restored);
      }
    }

    res.status(200).json({ message: "Report dismissed" });

  } catch (err) {
    console.log("DISMISS REPORT ERROR:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ==============================
   RESOLVE USER REPORT — suspend the user
============================== */
exports.resolveUserReport = async (req, res) => {
  try {
    const { reason } = req.body;

    const report = await Report.findById(req.params.id)
      .populate("reportedUser");

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    const reportedUser = report.reportedUser;

    if (!reportedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.findByIdAndUpdate(reportedUser._id, {
      isSuspended:      true,
      suspensionReason: reason || "Suspended after admin review of reports",
    });

    await Report.updateMany(
      { reportedUser: reportedUser._id },
      { status: "resolved" }
    );

    await createNotification(
      reportedUser._id,
      `Your account has been suspended. Reason: ${reason || "Policy violation"}`,
      "general"
    );

    /* ✅ Also emit socket so user gets kicked out if online */
    if (global.io) {
      console.log("📡 EMITTING userAutoSuspended (manual resolve) for:", reportedUser._id.toString());
      global.io.emit("userAutoSuspended", {
        userId: reportedUser._id.toString(),
        name:   reportedUser.name,
      });
    }

    res.status(200).json({ message: "User suspended and reports resolved" });

  } catch (err) {
    console.log("RESOLVE USER REPORT ERROR:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ==============================
   DISMISS USER REPORT — keep user, mark reviewed
============================== */
exports.dismissUserReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    report.status = "reviewed";
    await report.save();

    res.status(200).json({ message: "User report dismissed" });

  } catch (err) {
    console.log("DISMISS USER REPORT ERROR:", err);
    res.status(500).json({ message: "Server Error" });
  }
};