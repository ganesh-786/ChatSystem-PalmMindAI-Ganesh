import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const requiredEnv = ["MONGO_URI", "JWT_SECRET", "CLIENT_URL"];
const missing = requiredEnv.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variable(s): ${missing.join(", ")}`,
  );
}

const port = Number(process.env.PORT || 5000);
if (Number.isNaN(port) || port <= 0) {
  throw new Error("Invalid PORT value in environment configuration");
}

function parseDuration(value, fallbackMs) {
  if (!value) return fallbackMs;
  const amount = Number(value.replace(/[^0-9]/g, ""));
  if (Number.isNaN(amount)) return fallbackMs;

  if (value.endsWith("ms")) return amount;
  if (value.endsWith("s")) return amount * 1000;
  if (value.endsWith("m")) return amount * 60 * 1000;
  if (value.endsWith("h")) return amount * 60 * 60 * 1000;
  if (value.endsWith("d")) return amount * 24 * 60 * 60 * 1000;
  return fallbackMs;
}

const rawClientUrls = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((value) => value.trim())
  : ["http://localhost:3100"];

const allowedOrigins = Array.from(new Set(rawClientUrls));

if (process.env.NODE_ENV !== "production") {
  allowedOrigins.push("http://localhost:5173");
}

export const config = {
  port,
  nodeEnv: process.env.NODE_ENV === "production" ? "production" : "development",
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  refreshTokenMaxAge: parseDuration(
    process.env.JWT_REFRESH_EXPIRES_IN || "30d",
    30 * 24 * 60 * 60 * 1000,
  ),
  clientUrl: allowedOrigins[0],
  allowedOrigins,
  isProduction: process.env.NODE_ENV === "production",
};
