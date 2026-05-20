import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from './models/user.js';
import { Message } from './models/message.js';
import { config } from './config.js';

export function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: config.allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      socket.userId = decoded.userId;
      socket.user = await User.findById(decoded.userId);

      if (!socket.user) {
        return next(new Error('User not found'));
      }

      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  // Connection handling
  io.on('connection', (socket) => {
    console.log(`User ${socket.user.name} connected`);

    // Update user status to online
    socket.user.status = 'online';
    socket.user.lastSeen = new Date();
    socket.user.save();

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);

    // Broadcast user online status
    io.emit('user:online', {
      userId: socket.userId,
      name: socket.user.name,
      avatar: socket.user.avatar
    });

    // Handle room joining
    socket.on('room:join', async (roomId) => {
      try {
        socket.join(roomId);
        socket.currentRoom = roomId;

        // Send recent messages
        const messages = await Message.getRecentMessages(roomId, 50);
        socket.emit('room:history', { roomId, messages });

        // Notify others in the room
        socket.to(roomId).emit('user:joined', {
          userId: socket.userId,
          name: socket.user.name,
          avatar: socket.user.avatar
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Handle leaving rooms
    socket.on('room:leave', (roomId) => {
      socket.leave(roomId);
      if (socket.currentRoom === roomId) {
        delete socket.currentRoom;
      }

      // Notify others in the room
      socket.to(roomId).emit('user:left', {
        userId: socket.userId,
        name: socket.user.name
      });
    });

    // Handle sending messages
    socket.on('message:send', async (data) => {
      try {
        const { roomId, content } = data;

        const message = await Message.create({
          content,
          author: socket.userId,
          room: roomId
        });

        // Populate message with author info
        await message.populate('author', 'name avatar status');

        // Broadcast to room
        io.to(roomId).emit('message:new', message);

        // Update user typing status
        if (socket.user.isTyping === roomId) {
          socket.user.isTyping = null;
          socket.user.save();
          socket.to(roomId).emit('typing:stopped', {
            userId: socket.userId,
            name: socket.user.name
          });
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing:start', (roomId) => {
      if (socket.user.isTyping !== roomId) {
        socket.user.isTyping = roomId;
        socket.user.save();
        socket.to(roomId).emit('typing:started', {
          userId: socket.userId,
          name: socket.user.name
        });
      }
    });

    socket.on('typing:stop', (roomId) => {
      if (socket.user.isTyping === roomId) {
        socket.user.isTyping = null;
        socket.user.save();
        socket.to(roomId).emit('typing:stopped', {
          userId: socket.userId,
          name: socket.user.name
        });
      }
    });

    // Handle marking messages as read
    socket.on('message:read', async (data) => {
      try {
        const { messageId } = data;
        const message = await Message.findById(messageId);

        if (message && message.author.toString() !== socket.userId) {
          await message.markAsRead(socket.userId);

          // Notify author that message was read
          io.to(`user:${message.author.toString()}`).emit('message:read', {
            messageId,
            readerId: socket.userId,
            readAt: new Date()
          });
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to mark message as read' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User ${socket.user.name} disconnected`);

      // Update user status to offline
      socket.user.status = 'offline';
      socket.user.isTyping = null;
      await socket.user.save();

      // Notify others that user is offline
      io.emit('user:offline', {
        userId: socket.userId,
        name: socket.user.name,
        lastSeen: socket.user.lastSeen
      });

      // Notify rooms that user left
      if (socket.currentRoom) {
        socket.to(socket.currentRoom).emit('user:left', {
          userId: socket.userId,
          name: socket.user.name
        });
      }
    });
  });

  return io;
}