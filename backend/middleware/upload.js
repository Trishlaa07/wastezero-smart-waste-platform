const cloudinary             = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer                = require("multer");

// ✅ Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Store images directly on Cloudinary — never lost on redeploy
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         "wastezero",          // folder name in your Cloudinary account
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 800, crop: "limit" }], // resize large images
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

module.exports = upload;
