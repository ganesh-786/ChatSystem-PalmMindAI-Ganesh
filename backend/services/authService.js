import { User } from "../models/user.js";
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
} from "./tokenService.js";
import { config } from "../config.js";

const refreshTtlMs = config.refreshTokenMaxAge;

export async function registerUser({ email, name, password }) {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error("User already exists with this email");
    error.status = 400;
    throw error;
  }

  const user = await User.create({ email, name, password });
  const tokens = await createSessionTokens(user);
  return { user, tokens };
}

export async function loginUser(email, password) {
  const user = await User.findOne({ email }).select("+password +refreshTokens");
  if (!user) {
    const error = new Error("Invalid credentials");
    error.status = 400;
    throw error;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const error = new Error("Invalid credentials");
    error.status = 400;
    throw error;
  }

  user.status = "online";
  user.lastSeen = new Date();
  await user.save();

  const tokens = await createSessionTokens(user);
  return { user, tokens };
}

export async function refreshUserSession(refreshToken) {
  if (!refreshToken) {
    const error = new Error("Refresh token required");
    error.status = 401;
    throw error;
  }

  const hashed = hashToken(refreshToken);
  const user = await User.findOne({ "refreshTokens.token": hashed }).select(
    "+refreshTokens",
  );

  if (!user) {
    const error = new Error("Invalid refresh token");
    error.status = 401;
    throw error;
  }

  const tokenEntry = user.refreshTokens.find((entry) => entry.token === hashed);
  if (!tokenEntry || tokenEntry.expiresAt < new Date()) {
    user.refreshTokens = user.refreshTokens.filter(
      (entry) => entry.token !== hashed,
    );
    await user.save();

    const error = new Error("Refresh token expired or invalid");
    error.status = 401;
    throw error;
  }

  await revokeRefreshToken(user, refreshToken);
  const tokens = await createSessionTokens(user);
  return { user, tokens };
}

export async function revokeRefreshToken(user, refreshToken) {
  const hashed = hashToken(refreshToken);
  user.refreshTokens = user.refreshTokens.filter(
    (entry) => entry.token !== hashed,
  );
  await user.save();
}

async function createSessionTokens(user) {
  const accessToken = createAccessToken({ userId: user._id.toString() });
  const refreshToken = createRefreshToken();
  await user.addRefreshToken(refreshToken);

  return {
    accessToken,
    refreshToken,
    expiresIn: config.jwtExpiresIn,
  };
}
