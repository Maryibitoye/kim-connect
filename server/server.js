import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/db.js";
import User from "./models/User.js"; // Import the User model
import bcrypt from "bcrypt"; // Import bcrypt for password hashing
import { clerkWebhooks } from "./controllers/webhooks.js"; // Import clerkWebhooks

// Initialize Express
const app = express();

// Connect to MongoDB
connectDB()
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1); // Exit if DB connection fails
  });

// Middlewares
app.use(cors());
app.use(express.json()); // Parse JSON requests

// Test Route
app.get("/", (req, res) => res.send("API is working!"));

// User Registration Route
app.post("/api/users", async (req, res) => {
  try {
    const { name, email, password, image } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required!" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists!" });
    }

    // Hash password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword, // Save hashed password
      image: image || "", // Set image to empty string if not provided
    });

    await newUser.save();

    res
      .status(201)
      .json({ message: "User created successfully!", user: newUser });
  } catch (error) {
    console.error("❌ Error saving user:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});

// Webhooks Route - add raw body parsing
app.post(
  "/api/webhooks",
  express.raw({ type: "application/json" }),
  clerkWebhooks
);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
