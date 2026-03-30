const express = require("express");
const router = express.Router();
const {verifyToken,authorizeRoles} = require("../middleware/authMiddleware");

router.get("/admin",
   verifyToken,
   authorizeRoles("admin"),
   (req,res)=> res.json({message:"Welcome Admin"})
);

router.get("/ngo",
   verifyToken,
   authorizeRoles("ngo"),
   (req,res)=> res.json({message:"Welcome NGO"})
);

router.get("/volunteer",
   verifyToken,
   authorizeRoles("volunteer"),
   (req,res)=> res.json({message:"Welcome Volunteer"})
);

module.exports = router;