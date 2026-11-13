
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Limit repeated registration attempts
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." }
});

// Limit repeated login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again later." }
});

// Generate a short-lived access token
const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    { sub: userId },
    process.env.JWT_SECRET,
    {
      expiresIn: "15m",
      issuer: "voicenotes-api",
      audience: "voicenotes-app"
    }
  );
};

// Check request validation
const checkValidation = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Invalid input. Please check your details."
    });
  }

  next();
};

// REGISTER
router.post(
  "/register",
  registerLimiter,
  [
    body("name")
      .isString()
      .trim()
      .isLength({ min: 2, max: 60 }),

    body("email")
      .isString()
      .trim()
      .isEmail()
      .normalizeEmail({
        gmail_remove_dots: false,
        gmail_remove_subaddress: false
      }),

    body("password")
      .isString()
      .isLength({ min: 12 })
      .custom(value => Buffer.byteLength(value, "utf8") <= 72)
  ],
  checkValidation,
  async (req, res) => {
    try {
      const { name, email, password } = req.body;

      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res.status(409).json({
          message: "Unable to create an account with these details."
        });
      }

      const user = await User.create({
        name,
        email,
        password
      });

      const token = generateToken(user._id.toString());

      return res.status(201).json({
        message: "Account created successfully.",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          message: "Unable to create an account with these details."
        });
      }

      console.error("Registration error:", error.message);

      return res.status(500).json({
        message: "Unable to create your account right now."
      });
    }
  }
);

// LOGIN
router.post(
  "/login",
  loginLimiter,
  [
    body("email")
      .isString()
      .trim()
      .isEmail()
      .normalizeEmail({
        gmail_remove_dots: false,
        gmail_remove_subaddress: false
      }),

    body("password")
      .isString()
      .custom(value => Buffer.byteLength(value, "utf8") <= 72)
  ],
  checkValidation,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return res.status(401).json({
          message: "Invalid email or password."
        });
      }

      const passwordMatches = await user.comparePassword(password);

      if (!passwordMatches) {
        return res.status(401).json({
          message: "Invalid email or password."
        });
      }

      const token = generateToken(user._id.toString());

      return res.status(200).json({
        message: "Login successful.",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      });
    } catch (error) {
      console.error("Login error:", error.message);

      return res.status(500).json({
        message: "Unable to log in right now."
      });
    }
  }
);


// GET CURRENT USER
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User account not found."
      });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Fetch user error:", error.message);

    return res.status(500).json({
      message: "Unable to retrieve account information."
    });
  }
});


module.exports = router;
