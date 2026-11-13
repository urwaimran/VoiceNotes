
const express = require("express");
const { body, param, validationResult } = require("express-validator");

const Recording = require("../models/Recording");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// All recording routes require authentication.
router.use(protect);


// Get only the authenticated user's recordings.
router.get("/", async (req, res) => {
  try {
    const recordings = await Recording.find({
      user: req.user.id,
      isDeleted: false
    })
      .select("-__v")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      recordings
    });
  } catch (error) {
    console.error("Recording retrieval failed.");

    return res.status(500).json({
      message: "Unable to retrieve recordings."
    });
  }
});


// Create a recording entry.
router.post(
  "/",
  [
    body("title")
      .isString()
      .trim()
      .isLength({ min: 1, max: 120 }),

    body("storageKey")
      .isString()
      .trim()
      .isLength({ min: 1, max: 500 }),

    body("mimeType")
      .isIn(["audio/wav", "audio/mpeg", "audio/mp4", "audio/m4a", "audio/x-m4a"]),

    body("sizeBytes")
      .isInt({ min: 1, max: 100 * 1024 * 1024 })
      .toInt()
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Invalid recording information."
      });
    }

    try {
      const { title, storageKey, mimeType, sizeBytes } = req.body;

      const recording = await Recording.create({
        user: req.user.id,
        title,
        audio: {
          storageKey,
          mimeType,
          sizeBytes
        }
      });

      return res.status(201).json({
        message: "Recording created successfully.",
        recording: {
          id: recording._id,
          title: recording.title,
          status: recording.status,
          createdAt: recording.createdAt
        }
      });
    } catch (error) {
      console.error("Recording creation failed.");

      return res.status(500).json({
        message: "Unable to create recording."
      });
    }
  }
);


// Update recording title, transcript, or summary.
router.patch(
  "/:id",
  [
    param("id").isMongoId(),
    body("title").optional().isString().trim().isLength({ min: 1, max: 120 }),
    body("rawText").optional().isString().isLength({ max: 100000 }),
    body("displayText").optional().isString().isLength({ max: 100000 }),
    body("summaryText").optional().isString().isLength({ max: 30000 }),
    body("summaryLanguage").optional().isIn(["english", "urdu"])
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid update information." });
    }

    const updates = {};

    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.rawText !== undefined) updates["transcript.rawText"] = req.body.rawText;
    if (req.body.displayText !== undefined) updates["transcript.displayText"] = req.body.displayText;
    if (req.body.summaryText !== undefined) updates["summary.text"] = req.body.summaryText;
    if (req.body.summaryLanguage !== undefined) updates["summary.language"] = req.body.summaryLanguage;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields provided." });
    }

    try {
      const recording = await Recording.findOneAndUpdate(
        { _id: req.params.id, user: req.user.id, isDeleted: false },
        { $set: updates },
        { new: true, runValidators: true }
      ).select("-__v");

      if (!recording) {
        return res.status(404).json({ message: "Recording not found." });
      }

      return res.status(200).json({ recording });
    } catch (error) {
      console.error("Recording update failed.");
      return res.status(500).json({ message: "Unable to update recording." });
    }
  }
);


router.delete("/:id", param("id").isMongoId(), async (req, res) => {
  if (!validationResult(req).isEmpty()) {
    return res.status(400).json({ message: "Invalid recording ID." });
  }

  try {
    const recording = await Recording.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true }
    );

    if (!recording) {
      return res.status(404).json({ message: "Recording not found." });
    }

    return res.json({ message: "Recording moved to trash." });
  } catch {
    return res.status(500).json({ message: "Unable to delete recording." });
  }
});

router.patch("/:id/restore", param("id").isMongoId(), async (req, res) => {
  if (!validationResult(req).isEmpty()) {
    return res.status(400).json({ message: "Invalid recording ID." });
  }

  try {
    const recording = await Recording.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.id,
        isDeleted: true,
        deletedAt: { $gte: new Date(Date.now() - 30 * 86400000) }
      },
      { $set: { isDeleted: false, deletedAt: null } },
      { new: true }
    );

    if (!recording) {
      return res.status(404).json({ message: "Recording not found or trash period expired." });
    }

    return res.json({ message: "Recording restored." });
  } catch {
    return res.status(500).json({ message: "Unable to restore recording." });
  }
});



module.exports = router;
