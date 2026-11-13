const multer = require("multer");

const allowedTypes = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/ogg",
  "audio/webm"
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB
    files: 1
  },
  fileFilter: (req, file, callback) => {
    if (!allowedTypes.includes(file.mimetype)) {
      return callback(new Error("Unsupported audio format."));
    }

    callback(null, true);
  }
});

module.exports = upload;