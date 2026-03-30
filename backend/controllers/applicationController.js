const Application = require("../models/Application");
const Opportunity  = require("../models/Opportunity");
const { createNotification } = require("./notificationController");

/* =====================================
   VOLUNTEER APPLY TO OPPORTUNITY
===================================== */
exports.applyToOpportunity = async (req, res) => {
  try {
    const volunteerId       = req.user.id;
    const { opportunityId } = req.body;

    const opportunity = await Opportunity.findById(opportunityId);
    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }

    const existingApplication = await Application.findOne({
      volunteer:   volunteerId,
      opportunity: opportunityId,
    });

    if (existingApplication) {
      return res.status(400).json({
        message: "You have already applied to this opportunity",
      });
    }

    /* Check if spots are still available */
    if (
      opportunity.volunteersNeeded > 0 &&
      opportunity.applicantCount >= opportunity.volunteersNeeded
    ) {
      return res.status(400).json({
        message: "This opportunity has reached its volunteer limit",
      });
    }

    const application = await Application.create({
      volunteer:   volunteerId,
      opportunity: opportunityId,
    });

    /* Increment applicant count */
    await Opportunity.findByIdAndUpdate(opportunityId, {
      $inc: { applicantCount: 1 }
    });

    /* Notify NGO */
    await createNotification(
      opportunity.ngo,
      `A volunteer applied to your opportunity: "${opportunity.title}"`,
      "application",
      opportunity._id,
      "Opportunity"
    );

    /* Real-time: tell NGO with full skills + requiredSkills */
    if (global.io) {
      const populated = await Application.findById(application._id)
        .populate("volunteer",   "name email skills")
        .populate("opportunity", "title date location status requiredSkills volunteersNeeded");

      global.io
        .to(opportunity.ngo.toString())
        .emit("newApplication", populated);

      global.io.emit("opportunityCountUpdated", {
        opportunityId,
        applicantCount: opportunity.applicantCount + 1,
      });
    }

    res.status(201).json({ message: "Applied successfully", application });

  } catch (error) {
    console.log("APPLY ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/* =====================================
   NGO VIEW APPLICATIONS
===================================== */
exports.getNGOApplications = async (req, res) => {
  try {
    const ngoId = req.user.id;

    const opportunities  = await Opportunity.find({ ngo: ngoId }).select("_id");
    const opportunityIds = opportunities.map(o => o._id);

    const applications = await Application.find({
      opportunity: { $in: opportunityIds },
    })
      .populate("volunteer",   "name email skills")
      .populate("opportunity", "title date location status requiredSkills volunteersNeeded")
      .sort({ createdAt: -1 });

    res.status(200).json(applications);

  } catch (error) {
    console.log("GET NGO APPLICATION ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/* =====================================
   NGO ACCEPT / REJECT APPLICATION
===================================== */
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id }     = req.params;

    const application = await Application.findById(id)
      .populate("opportunity");

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (application.opportunity.ngo.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You can manage only your own applications",
      });
    }

    application.status = status;
    await application.save();

    /* If rejected, free up a spot */
    if (status === "rejected") {
      await Opportunity.findByIdAndUpdate(application.opportunity._id, {
        $inc: { applicantCount: -1 }
      });

      if (global.io) {
        const opp = await Opportunity.findById(application.opportunity._id);
        global.io.emit("opportunityCountUpdated", {
          opportunityId:  opp._id.toString(),
          applicantCount: opp.applicantCount,
        });
      }
    }

    /* Notify volunteer */
    await createNotification(
      application.volunteer,
      `Your application for "${application.opportunity.title}" was ${status}`,
      "application",
      application.opportunity._id,
      "Opportunity"
    );

    /* Real-time: tell volunteer */
    if (global.io) {
      global.io
        .to(application.volunteer.toString())
        .emit("applicationUpdate", {
          opportunityId: application.opportunity._id,
          status,
        });
    }

    res.status(200).json({ message: "Application updated", application });

  } catch (error) {
    console.log("UPDATE STATUS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/* =====================================
   CHECK IF VOLUNTEER ALREADY APPLIED
===================================== */
exports.checkIfApplied = async (req, res) => {
  try {
    const volunteerId       = req.user.id;
    const { opportunityId } = req.params;

    const existingApplication = await Application.findOne({
      volunteer:   volunteerId,
      opportunity: opportunityId,
    });

    if (existingApplication) {
      return res.status(200).json({
        applied: true,
        status:  existingApplication.status,
      });
    }

    res.status(200).json({ applied: false });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* =====================================
   VOLUNTEER VIEW OWN APPLICATIONS
===================================== */
exports.getVolunteerApplications = async (req, res) => {
  try {
    const volunteerId = req.user.id;

    const applications = await Application.find({ volunteer: volunteerId })
      .populate("opportunity", "title date location status volunteersNeeded applicantCount requiredSkills")
      .sort({ createdAt: -1 });

    res.status(200).json(applications);

  } catch (error) {
    console.log("GET VOLUNTEER APPLICATION ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};