"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachSocket = attachSocket;
const db_1 = require("./db");
const utils_1 = require("./utils");
function attachSocket(io) {
    // Socket auth via handshake query token
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token)
            return next(new Error('Authentication error'));
        try {
            const jwt = require('jsonwebtoken');
            const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
            const user = (0, db_1.get)('SELECT id FROM users WHERE id = ?', [payload.sub]);
            if (!user)
                return next(new Error('User not found'));
            socket.userId = user.id;
            next();
        }
        catch (e) {
            next(new Error('Authentication error'));
        }
    });
    const typingTimers = {};
    io.on('connection', (socket) => {
        const userId = socket.userId;
        // Presence: mark online and broadcast
        (0, db_1.run)('UPDATE users SET status = ?, lastSeen = ? WHERE id = ?', ['online', (0, utils_1.now)(), userId]);
        socket.broadcast.emit('presence:update', { userId, status: 'online' });
        // Join DM rooms for each conversation
        const myConvos = (0, db_1.all)('SELECT conversationId FROM conversation_members WHERE userId = ?', [userId]);
        for (const c of myConvos) {
            socket.join(`conv:${c.conversationId}`);
        }
        // --- Typing indicators ---
        socket.on('typing:start', ({ conversationId }) => {
            socket.to(`conv:${conversationId}`).emit('typing:start', { userId, conversationId });
        });
        socket.on('typing:stop', ({ conversationId }) => {
            socket.to(`conv:${conversationId}`).emit('typing:stop', { userId, conversationId });
        });
        // --- New message ---
        socket.on('message:create', ({ conversationId, content, mediaUrl, mediaType }, callback) => {
            const member = (0, db_1.get)('SELECT 1 FROM conversation_members WHERE conversationId = ? AND userId = ?', [conversationId, userId]);
            if (!member) {
                callback?.({ error: 'Not a member' });
                return;
            }
            const msgId = (0, utils_1.uuid)();
            const createdAt = (0, utils_1.now)();
            (0, db_1.run)('INSERT INTO messages (id, conversationId, senderId, content, mediaUrl, mediaType, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)', [msgId, conversationId, userId, String(content || ''), mediaUrl || null, mediaType || null, createdAt]);
            const msg = (0, db_1.get)(`SELECT m.*, u.username, u.displayName, u.avatarColor, u.status
         FROM messages m JOIN users u ON m.senderId = u.id WHERE m.id = ?`, [msgId]);
            // Reset lastReadAt for the sender so their own unread count doesn't increase
            (0, db_1.run)('UPDATE conversation_members SET lastReadAt = ? WHERE conversationId = ? AND userId = ?', [(0, utils_1.now)(), conversationId, userId]);
            io.to(`conv:${conversationId}`).emit('message:new', { message: msg });
            callback?.({ message: msg });
        });
        // --- Read receipts ---
        socket.on('message:read', ({ conversationId }) => {
            (0, db_1.run)('UPDATE conversation_members SET lastReadAt = ? WHERE conversationId = ? AND userId = ?', [(0, utils_1.now)(), conversationId, userId]);
            // Notify others in the conversation that this user has read
            socket.to(`conv:${conversationId}`).emit('message:read', { conversationId, userId });
        });
        // --- Disconnect: mark offline ---
        socket.on('disconnect', () => {
            (0, db_1.run)('UPDATE users SET status = ?, lastSeen = ? WHERE id = ?', ['offline', (0, utils_1.now)(), userId]);
            socket.broadcast.emit('presence:update', { userId, status: 'offline' });
        });
    });
}
//# sourceMappingURL=socket.js.map