
const mongoose = require("mongoose");

const recordingSchema = new mongoose.Schema(
  {
    // Every recording must belong to an authenticated user.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120
    },

    // Store file references and metadata, not audio binaries.
    audio: {
        storageKey: { type: String, required: true },
        mimeType: { type: String, required: true },
        sizeBytes: { type: Number, required: true, min: 1 },
        originalName: { type: String, default: "" }
    },

    transcript: {
      rawText: { type: String, default: "" },
      displayText: { type: String, default: "" }
    },

    summary: {
      text: { type: String, default: "" },
      language: {
        type: String,
        enum: ["english", "urdu", null],
        default: null
      }
    },

    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending"
    },

    isDeleted: {
      type: Boolean,
      default: false
    },

    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    strict: true
  }
);

// Useful for retrieving a user's recordings efficiently.
recordingSchema.index({ user: 1, createdAt: -1 });
recordingSchema.index({ user: 1, isDeleted: 1 });

module.exports = mongoose.model("Recording", recordingSchema);
