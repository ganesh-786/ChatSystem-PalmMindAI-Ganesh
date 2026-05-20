import express from "express";
import { User } from "../models/user.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticateToken, async (req, res, next) => {
  try {
    const users = await User.find().lean();
    res.json({ data: users });
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { email, name, role } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.create({ email, name, role });
    res.status(201).json({ data: user });
  } catch (error) {
    next(error);
  }
});

export default router;
