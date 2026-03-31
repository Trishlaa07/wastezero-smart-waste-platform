const Pickup = require("../models/Pickup");

// @desc    Get overall waste statistics
// @route   GET /api/stats/waste
// @access  Private/Admin/NGO
const getWasteStats = async (req, res) => {
  try {
    const stats = await Pickup.aggregate([
      {
        $group: {
          _id: "$wasteType",
          totalWeight: { $sum: "$actualWeight" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalWeight: -1 } },
    ]);

    const totalWeight = stats.reduce((acc, curr) => acc + curr.totalWeight, 0);
    const totalPickups = stats.reduce((acc, curr) => acc + curr.count, 0);

    res.status(200).json({
      success: true,
      data: {
        byType: stats,
        totalWeight,
        totalPickups,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user's personal waste statistics
// @route   GET /api/stats/user-waste
// @access  Private
const getUserWasteStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await Pickup.aggregate([
      { $match: { volunteer: userId, status: "completed" } },
      {
        $group: {
          _id: "$wasteType",
          totalWeight: { $sum: "$actualWeight" },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalWeight = stats.reduce((acc, curr) => acc + curr.totalWeight, 0);

    res.status(200).json({
      success: true,
      data: {
        byType: stats,
        totalWeight,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getWasteStats,
  getUserWasteStats,
};
