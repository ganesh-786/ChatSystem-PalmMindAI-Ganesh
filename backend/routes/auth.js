import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { config } from "../config.js";
import {
  registerUser,
  loginUser,
  refreshUserSession,
  revokeRefreshToken,
} from "../services/authService.js";
import {
  validateRegistration,
  validateLogin,
  validateUserProfile,
} from "../middleware/validators.js";

const router = express.Router();

const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: config.isProduction ? "none" : "lax",
  maxAge: config.refreshTokenMaxAge,
  path: "/",
};

function attachRefreshCookie(res, refreshToken) {
  res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);
}

function clearRefreshCookie(res) {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? "none" : "lax",
    path: "/",
  });
}

router.post("/register", validateRegistration, async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    const { user, tokens } = await registerUser({ email, password, name });
    attachRefreshCookie(res, tokens.refreshToken);

    res.status(201).json({
      message: "User created successfully",
      user: user.toJSON(),
      token: tokens.accessToken,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", validateLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, tokens } = await loginUser(email, password);
    attachRefreshCookie(res, tokens.refreshToken);

    res.json({
      message: "Login successful",
      user: user.toJSON(),
      token: tokens.accessToken,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    const { user, tokens } = await refreshUserSession(refreshToken);
    attachRefreshCookie(res, tokens.refreshToken);

    res.json({
      message: "Session refreshed successfully",
      user: user.toJSON(),
      token: tokens.accessToken,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", authenticateToken, async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await revokeRefreshToken(req.user, refreshToken);
    }

    req.user.status = "offline";
    req.user.lastSeen = new Date();
    await req.user.save();

    clearRefreshCookie(res);
    res.json({ message: "Logout successful" });
  } catch (error) {
    next(error);
  }
});

router.get("/me", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

router.put(
  "/profile",
  authenticateToken,
  validateUserProfile,
  async (req, res, next) => {
    try {
      const updates = req.body;
      const allowedUpdates = ["name", "avatar"];
      const filteredUpdates = Object.keys(updates).reduce((obj, key) => {
        if (allowedUpdates.includes(key)) {
          obj[key] = updates[key];
        }
        return obj;
      }, {});

      const user = await req.user.set(filteredUpdates).save();

      res.json({
        message: "Profile updated successfully",
        user: user.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
