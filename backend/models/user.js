import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { hashToken } from "../services/tokenService.js";
import { config } from "../config.js";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // Don't include password in queries by default
    },
    name: {
      type: String,
      trim: true,
      required: true,
      minlength: 2,
      maxlength: 50,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    avatar: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["online", "offline", "away"],
      default: "offline",
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    isTyping: {
      type: String,
      default: null, // roomId where user is typing
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      select: false,
    },
    refreshTokens: [
      {
        token: {
          type: String,
          select: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        expiresAt: {
          type: Date,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Add a refresh token item for the user
userSchema.methods.addRefreshToken = async function (refreshToken) {
  const hashed = hashToken(refreshToken);
  const expiration = new Date(Date.now() + config.refreshTokenMaxAge);
  this.refreshTokens.push({ token: hashed, expiresAt: expiration });
  return await this.save();
};

userSchema.methods.revokeRefreshToken = async function (refreshToken) {
  const hashed = hashToken(refreshToken);
  this.refreshTokens = this.refreshTokens.filter(
    (entry) => entry.token !== hashed,
  );
  return await this.save();
};

userSchema.statics.findByRefreshToken = function (refreshToken) {
  const hashed = hashToken(refreshToken);
  return this.findOne({ "refreshTokens.token": hashed }).select(
    "+refreshTokens",
  );
};

// Method to get user without sensitive data
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.verificationToken;
  delete user.refreshTokens;
  return user;
};

export const User = mongoose.models.User || mongoose.model("User", userSchema);
