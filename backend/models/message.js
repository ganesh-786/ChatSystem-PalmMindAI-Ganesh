import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      maxlength: 5000,
      trim: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    room: {
      type: String,
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    edited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for efficient room-based queries
messageSchema.index({ room: 1, timestamp: 1 });

// Index for recent messages
messageSchema.index({ room: 1, timestamp: -1 });

// Virtual for checking if message is read by specific user
messageSchema.virtual("isRead").get(function () {
  return this.readBy.some(
    (read) => read.user.toString() === this._id.toString(),
  );
});

// Method to mark message as read
messageSchema.methods.markAsRead = function (userId) {
  const existingRead = this.readBy.find(
    (read) => read.user.toString() === userId.toString(),
  );

  if (!existingRead) {
    this.readBy.push({ user: userId });
    return this.save();
  }

  return Promise.resolve(this);
};

// Static method to get recent messages for a room
messageSchema.statics.getRecentMessages = function (roomId, limit = 50) {
  return this.find({ room: roomId })
    .populate("author", "name avatar status")
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

export const Message =
  mongoose.models.Message || mongoose.model("Message", messageSchema);
