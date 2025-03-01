import { Webhook } from "svix";
import User from "../models/User.js";

export const clerkWebhooks = async (req, res) => {
  try {
    console.log("📥 Incoming Clerk webhook request");

    // Ensure Webhook Secret Exists
    if (!process.env.CLERK_WEBHOOK_SECRET) {
      console.error("❌ CLERK_WEBHOOK_SECRET is missing!");
      return res.status(500).json({ error: "Webhook configuration error" });
    }

    // Create svix instance
    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

    // Verify Headers & Signature
    try {
      await whook.verify(Buffer.from(JSON.stringify(req.body)), {
        "svix-id": req.headers["svix-id"],
        "svix-timestamp": req.headers["svix-timestamp"],
        "svix-signature": req.headers["svix-signature"],
      });
      console.log("✅ Webhook signature verified");
    } catch (err) {
      console.error("❌ Webhook verification failed:", err);
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    // Extract event data
    const { data, type } = req.body;
    console.log(`📋 Processing event: ${type}`);

    switch (type) {
      case "user.created":
        await handleUserCreated(data, res);
        break;

      case "user.updated":
        await handleUserUpdated(data, res);
        break;

      case "user.deleted":
        await handleUserDeleted(data, res);
        break;

      default:
        console.log("❓ Unknown event type received:", type);
        return res.status(400).json({ error: "Unhandled event type" });
    }
  } catch (error) {
    console.error("❌ Webhook processing error:", error.message);
    res.status(500).json({ success: false, message: "Internal Webhook Error" });
  }
};

// Handle New User Creation
const handleUserCreated = async (data, res) => {
  console.log("👤 Creating new user");

  if (!data || !data.id || !data.email_addresses || !data.email_addresses[0]) {
    return res.status(400).json({ error: "Invalid user data" });
  }

  const userData = {
    _id: data.id,
    email: data.email_addresses[0].email_address,
    name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
    image: data.image_url || "",
    resume: "",
  };

  try {
    const newUser = new User(userData);
    await newUser.save();
    console.log("✅ User created successfully:", newUser.email);
    res.status(201).json({ success: true, message: "User created", user: newUser });
  } catch (error) {
    console.error("❌ Error saving user:", error.message);
    res.status(500).json({ error: "Failed to save user" });
  }
};

// Handle User Updates
const handleUserUpdated = async (data, res) => {
  console.log("🔄 Updating user");

  if (!data || !data.id || !data.email_addresses || !data.email_addresses[0]) {
    return res.status(400).json({ error: "Invalid user update data" });
  }

  const userData = {
    email: data.email_addresses[0].email_address,
    name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
    image: data.image_url || "",
  };

  try {
    await User.findByIdAndUpdate(data.id, userData);
    console.log("✅ User updated:", userData.email);
    res.json({ success: true, message: "User updated", user: userData });
  } catch (error) {
    console.error("❌ Error updating user:", error.message);
    res.status(500).json({ error: "Failed to update user" });
  }
};

// Handle User Deletion
const handleUserDeleted = async (data, res) => {
  console.log("❌ Deleting user");

  if (!data || !data.id) {
    return res.status(400).json({ error: "Invalid user delete data" });
  }

  try {
    await User.findByIdAndDelete(data.id);
    console.log("✅ User deleted successfully:", data.id);
    res.json({ success: true, message: "User deleted" });
  } catch (error) {
    console.error("❌ Error deleting user:", error.message);
    res.status(500).json({ error: "Failed to delete user" });
  }
};
