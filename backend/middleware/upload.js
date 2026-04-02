const cloudinary             = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer                = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          "wastezero",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation:  [{ width: 800, crop: "limit" }],
    format:          "jpg",
  },
});

// ✅ Override filename to store full secure_url instead of public_id
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, true),
});

module.exports = upload;