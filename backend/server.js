const authRoutes = require("./routes/authRoutes");
const express = require("express");
const helmet = require("helmet");
const recordingRoutes = require("./routes/recordingRoutes");
require("dotenv").config();

const connectDB = require("./config/db");

const app = express();

// Security headers
app.use(helmet());

// Limit incoming JSON payload size
app.use(express.json({ limit: "10kb" }));

app.use("/api/auth", authRoutes);
app.use("/api/recordings", recordingRoutes);

// Parse URL-encoded data safely
app.use(express.urlencoded({
  extended: false,
  limit: "10kb"
}));

// Basic API health check
app.get("/", (req, res) => {
  res.json({
    message: "VoiceNotes backend is running!",
    status: "OK"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    service: "VoiceNotes API",
    status: "healthy"
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`VoiceNotes server running on port ${PORT}`);
  });
};

startServer();
