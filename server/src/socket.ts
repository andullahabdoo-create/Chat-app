import { Server, Socket } from 'socket.io';
import { get, run, all } from './db';
import { uuid, now } from './utils';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function attachSocket(io: Server) {
  // Socket auth via handshake query token
  io.use((socket, next) => {
    const token = (socket.handshake.auth as any)?.token || (socket.handshake.query as any)?.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
      const user = get('SELECT id FROM users WHERE id = ?', [payload.sub]);
      if (!user) return next(new Error('User not found'));
      (socket as AuthenticatedSocket).userId = user.id;
      next();
    } catch (e) {
      next(new Error('Authentication error'));
    }
  });

  const typingTimers: Record<string, NodeJS.Timeout> = {};

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;

    // Presence: mark online and broadcast
    run('UPDATE users SET status = ?, lastSeen = ? WHERE id = ?', ['online', now(), userId]);
    socket.broadcast.emit('presence:update', { userId, status: 'online' });

    // Join DM rooms for each conversation
    const myConvos = all('SELECT conversationId FROM conversation_members WHERE userId = ?', [userId]);
    for (const c of myConvos) {
      socket.join(`conv:${c.conversationId}`);
    }

    // --- Typing indicators ---
    socket.on('typing:start', ({ conversationId }: { conversationId: string }) => {
      socket.to(`conv:${conversationId}`).emit('typing:start', { userId, conversationId });
    });
    socket.on('typing:stop', ({ conversationId }: { conversationId: string }) => {
      socket.to(`conv:${conversationId}`).emit('typing:stop', { userId, conversationId });
    });

    // --- New message ---
    socket.on('message:create', ({ conversationId, content, mediaUrl, mediaType }, callback) => {
      const member = get('SELECT 1 FROM conversation_members WHERE conversationId = ? AND userId = ?', [conversationId, userId]);
      if (!member) {
        callback?.({ error: 'Not a member' });
        return;
      }

      const msgId = uuid();
      const createdAt = now();
      run(
        'INSERT INTO messages (id, conversationId, senderId, content, mediaUrl, mediaType, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [msgId, conversationId, userId, String(content || ''), mediaUrl || null, mediaType || null, createdAt]
      );

      const msg = get(
        `SELECT m.*, u.username, u.displayName, u.avatarColor, u.status
         FROM messages m JOIN users u ON m.senderId = u.id WHERE m.id = ?`,
        [msgId]
      );

      // Reset lastReadAt for the sender so their own unread count doesn't increase
      run('UPDATE conversation_members SET lastReadAt = ? WHERE conversationId = ? AND userId = ?', [now(), conversationId, userId]);

      io.to(`conv:${conversationId}`).emit('message:new', { message: msg });
      callback?.({ message: msg });
    });

    // --- Read receipts ---
    socket.on('message:read', ({ conversationId }: { conversationId: string }) => {
      run('UPDATE conversation_members SET lastReadAt = ? WHERE conversationId = ? AND userId = ?', [now(), conversationId, userId]);
      // Notify others in the conversation that this user has read
      socket.to(`conv:${conversationId}`).emit('message:read', { conversationId, userId });
    });

    // --- Disconnect: mark offline ---
    socket.on('disconnect', () => {
      run('UPDATE users SET status = ?, lastSeen = ? WHERE id = ?', ['offline', now(), userId]);
      socket.broadcast.emit('presence:update', { userId, status: 'offline' });
    });
  });
}