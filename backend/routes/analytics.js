import express from 'express';
import { Message } from '../models/message.js';
import { User } from '../models/user.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get overall statistics
router.get('/stats', authenticateToken, async (req, res, next) => {
  try {
    const [
      totalMessages,
      totalUsers,
      activeRooms,
      onlineUsers
    ] = await Promise.all([
      Message.countDocuments(),
      User.countDocuments(),
      Message.distinct('room'),
      User.countDocuments({ status: 'online' })
    ]);

    // Get message activity for the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentMessages = await Message.countDocuments({
      timestamp: { $gte: yesterday }
    });

    // Get top active rooms
    const topRooms = await Message.aggregate([
      { $group: { _id: '$room', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      data: {
        totalMessages,
        totalUsers,
        activeRooms: activeRooms.length,
        onlineUsers,
        recentMessages,
        topRooms
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get message activity timeline
router.get('/activity', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { days = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activity = await Message.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ data: activity });
  } catch (error) {
    next(error);
  }
});

// Get user engagement metrics
router.get('/users/engagement', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const engagement = await User.aggregate([
      {
        $lookup: {
          from: 'messages',
          localField: '_id',
          foreignField: 'author',
          as: 'messages'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          status: 1,
          lastSeen: 1,
          messageCount: { $size: '$messages' },
          lastMessageDate: { $max: '$messages.timestamp' }
        }
      },
      { $sort: { messageCount: -1 } },
      { $limit: 20 }
    ]);

    res.json({ data: engagement });
  } catch (error) {
    next(error);
  }
});

export default router;