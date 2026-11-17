"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../auth");
const utils_1 = require("../utils");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// Get messages in a conversation (paginated)
router.get('/:conversationId', (req, res) => {
    const myId = req.user.id;
    const { conversationId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const before = req.query.before ? Number(req.query.before) : null;
    // Verify membership
    if (!(0, db_1.get)('SELECT 1 FROM conversation_members WHERE conversationId = ? AND userId = ?', [conversationId, myId])) {
        return res.status(403).json({ error: 'Not a member' });
    }
    let messages;
    if (before) {
        messages = (0, db_1.all)(`SELECT m.*, u.username, u.displayName, u.avatarColor, u.status
       FROM messages m
       JOIN users u ON m.senderId = u.id
       WHERE m.conversationId = ? AND m.createdAt < ?
       ORDER BY m.createdAt DESC LIMIT ?`, [conversationId, before, limit]);
    }
    else {
        messages = (0, db_1.all)(`SELECT m.*, u.username, u.displayName, u.avatarColor, u.status
       FROM messages m
       JOIN users u ON m.senderId = u.id
       WHERE m.conversationId = ?
       ORDER BY m.createdAt DESC LIMIT ?`, [conversationId, limit]);
    }
    res.json({ messages: messages.reverse() });
});
// Send a message (text or media)
router.post('/', (req, res) => {
    const myId = req.user.id;
    const { conversationId, content, mediaUrl, mediaType } = req.body || {};
    if (!conversationId)
        return res.status(400).json({ error: 'conversationId required' });
    if (!(0, db_1.get)('SELECT 1 FROM conversation_members WHERE conversationId = ? AND userId = ?', [conversationId, myId])) {
        return res.status(403).json({ error: 'Not a member' });
    }
    const msgId = (0, utils_1.uuid)();
    const createdAt = (0, utils_1.now)();
    (0, db_1.run)('INSERT INTO messages (id, conversationId, senderId, content, mediaUrl, mediaType, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)', [msgId, conversationId, myId, String(content || ''), mediaUrl || null, mediaType || null, createdAt]);
    const msg = (0, db_1.get)(`SELECT m.*, u.username, u.displayName, u.avatarColor, u.status
     FROM messages m JOIN users u ON m.senderId = u.id WHERE m.id = ?`, [msgId]);
    res.json({ message: msg });
});
exports.default = router;
//# sourceMappingURL=messages.js.map