import rateLimit from "express-rate-limit";

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const removeMongoOperators = (obj) => {
  if (!obj || typeof obj !== "object") return;

  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
      continue;
    }

    if (typeof obj[key] === "string") {
      obj[key] = escapeHtml(obj[key]);
      continue;
    }

    if (typeof obj[key] === "object" && obj[key] !== null) {
      removeMongoOperators(obj[key]);
    }
  }
};

const sanitizeRequest = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    removeMongoOperators(req.body);
  }
  if (req.query && typeof req.query === "object") {
    removeMongoOperators(req.query);
  }
  if (req.params && typeof req.params === "object") {
    removeMongoOperators(req.params);
  }
  next();
};

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please try again later.",
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many authentication attempts. Please try again later.",
  },
});

export const sanitizeInput = [sanitizeRequest];
