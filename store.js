/* Worksheet file uploads.
   - If CLOUDINARY_URL is set (free tier is fine), files go to Cloudinary → permanent URL.
   - Otherwise files land in ./uploads on local disk. NOTE: Railway's filesystem is
     ephemeral — local files vanish on redeploy. Fine for testing, use Cloudinary for real. */
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
});

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

let cloudinary = null;
if (process.env.CLOUDINARY_URL) {
  cloudinary = require("cloudinary").v2; // reads CLOUDINARY_URL automatically
  console.log("☁️  Cloudinary storage enabled");
} else {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.warn("⚠️  CLOUDINARY_URL not set — files stored on local disk (ephemeral on Railway).");
}

/* Returns { url, name } for the stored file. */
async function storeFile(file, baseUrl) {
  const safeName = file.originalname.replace(/[^\w.\-() ]/g, "_");
  if (cloudinary) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "auto", folder: "esl-steve-worksheets", use_filename: true },
        (err, res) => (err ? reject(err) : resolve(res))
      );
      stream.end(file.buffer);
    });
    return { url: result.secure_url, name: safeName };
  }
  const fname = crypto.randomBytes(8).toString("hex") + "-" + safeName;
  fs.writeFileSync(path.join(UPLOAD_DIR, fname), file.buffer);
  return { url: `${baseUrl}/uploads/${encodeURIComponent(fname)}`, name: safeName };
}

module.exports = { upload, storeFile, UPLOAD_DIR };
