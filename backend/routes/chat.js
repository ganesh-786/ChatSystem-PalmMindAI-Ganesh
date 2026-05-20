import express from "express";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import { authenticateToken } from "../middleware/auth.js";
import {
  validateRoomId,
  validateRoomMessage,
  validateMessageId,
  validateMessageUpdate,
} from "../middleware/validators.js";

const router = express.Router();

// Get all messages in a room
router.get(
  "/rooms/:roomId/messages",
  authenticateToken,
  validateRoomId,
  async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const messages = await Message.find({ room: roomId })
        .populate("author", "name avatar status")
        .sort({ timestamp: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      // Mark messages as read
      const messageIds = messages.map((m) => m._id);
      await Message.updateMany(
        { _id: { $in: messageIds }, author: { $ne: req.user._id } },
        { $addToSet: { readBy: { user: req.user._id } } },
      );

      res.json({ data: messages.reverse() });
    } catch (error) {
      next(error);
    }
  },
);

// Get all active rooms
router.get("/rooms", authenticateToken, async (req, res, next) => {
  try {
    const rooms = await Message.distinct("room");
    const roomStats = await Message.aggregate([
      {
        $group: {
          _id: "$room",
          count: { $sum: 1 },
          lastMessage: { $max: "$timestamp" },
        },
      },
    ]);

    const roomsWithStats = rooms.map((roomId) => {
      const stats = roomStats.find((r) => r._id === roomId);
      return {
        id: roomId,
        messageCount: stats ? stats.count : 0,
        lastMessage: stats ? stats.lastMessage : null,
      };
    });

    res.json({ data: roomsWithStats });
  } catch (error) {
    next(error);
  }
});

// Create a new room
router.post("/rooms", authenticateToken, async (req, res, next) => {
  try {
    const { name, participants } = req.body;

    const roomId = name || `room-${Date.now()}`;
    const allParticipants = participants || [];
    if (!allParticipants.includes(req.user._id.toString())) {
      allParticipants.push(req.user._id.toString());
    }

    res.status(201).json({
      message: "Room created successfully",
      room: {
        id: roomId,
        name: name || roomId,
        participants: allParticipants,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get online users
router.get("/users/online", authenticateToken, async (req, res, next) => {
  try {
    const onlineUsers = await User.find({ status: "online" })
      .select("name avatar status lastSeen")
      .lean();

    res.json({ data: onlineUsers });
  } catch (error) {
    next(error);
  }
});

// Get user typing status in a room
router.get(
  "/rooms/:roomId/typing",
  authenticateToken,
  async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const typingUsers = await User.find({
        isTyping: roomId,
        status: "online",
      })
        .select("name avatar")
        .lean();

      res.json({ data: typingUsers });
    } catch (error) {
      next(error);
    }
  },
);

// Delete a message
router.delete(
  "/messages/:messageId",
  authenticateToken,
  validateMessageId,
  async (req, res, next) => {
    try {
      const { messageId } = req.params;
      const message = await Message.findOne({
        _id: messageId,
        author: req.user._id,
      });

      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      await Message.findByIdAndDelete(messageId);

      res.json({ message: "Message deleted successfully" });
    } catch (error) {
      next(error);
    }
  },
);

// Edit a message
router.put(
  "/messages/:messageId",
  authenticateToken,
  validateMessageId,
  validateMessageUpdate,
  async (req, res, next) => {
    try {
      const { messageId } = req.params;
      const { content } = req.body;

      const message = await Message.findOne({
        _id: messageId,
        author: req.user._id,
      });

      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      message.content = content;
      message.edited = true;
      message.editedAt = new Date();
      await message.save();

      res.json({
        message: "Message updated successfully",
        updatedMessage: message,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
