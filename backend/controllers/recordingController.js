const cloudinary = require("../config/cloudinary");
const Recording = require("../models/Recording");

const uploadRecording = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Please select an audio file." });
  }

  const title =
    (req.body.title || req.file.originalname.replace(/\.[^/.]+$/, ""))
      .trim()
      .slice(0, 120) || "Untitled recording";

  const stream = cloudinary.uploader.upload_stream(
    {
      resource_type: "video",
      folder: "voicenotes/audio",
      type: "authenticated",
      use_filename: false
    },
    async (error, result) => {
      if (error) {
        return res.status(502).json({ message: "Audio storage upload failed." });
      }

      try {
        const recording = await Recording.create({
          user: req.user.id,
          title,
          audio: {
            storageKey: result.public_id,
            mimeType: req.file.mimetype,
            sizeBytes: req.file.size,
            originalName: req.file.originalname
          },
          status: "pending"
        });

        return res.status(201).json({
          message: "Recording uploaded successfully.",
          recording
        });
      } catch (dbError) {
        await cloudinary.uploader.destroy(result.public_id, {
          resource_type: "video",
          type: "authenticated"
        }).catch(() => {});

        return res.status(500).json({
          message: "Could not save recording details."
        });
      }
    }
  );

  stream.end(req.file.buffer);
};

module.exports = { uploadRecording };