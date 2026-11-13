
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`VoiceNotes server running on port ${PORT}`);
});