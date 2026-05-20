import express from "express";
import authRouter from "./auth.js";
import chatRouter from "./chat.js";
import analyticsRouter from "./analytics.js";
import usersRouter from "./users.js";

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

router.use("/auth", authRouter);
router.use("/chat", chatRouter);
router.use("/analytics", analyticsRouter);
router.use("/users", usersRouter);

export default router;
