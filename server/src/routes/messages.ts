import { Router, Request, Response } from 'express';
import { get, run, all } from '../db';
import { authMiddleware } from '../auth';
import { uuid, now } from '../utils';

const router = Router();
router.use(authMiddleware);

// Get messages in a conversation (paginated)
router.get('/:conversationId', (req: any, res: any) => {
  const myId = (req as any).user.id;
  const { conversationId } = req.params;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const before = req.query.before ? Number(req.query.before) : null;

  // Verify membership
  if (!get('SELECT 1 FROM conversation_members WHERE conversationId = ? AND userId = ?', [conversationId, myId])) {
    return res.status(403).json({ error: 'Not a member' });
  }

  let messages: any[];
  if (before) {
    messages = all(
      `SELECT m.*, u.username, u.displayName, u.avatarColor, u.status
       FROM messages m
       JOIN users u ON m.senderId = u.id
       WHERE m.conversationId = ? AND m.createdAt < ?
       ORDER BY m.createdAt DESC LIMIT ?`,
      [conversationId, before, limit]
    );
  } else {
    messages = all(
      `SELECT m.*, u.username, u.displayName, u.avatarColor, u.status
       FROM messages m
       JOIN users u ON m.senderId = u.id
       WHERE m.conversationId = ?
       ORDER BY m.createdAt DESC LIMIT ?`,
      [conversationId, limit]
    );
  }
  res.json({ messages: messages.reverse() });
});

// Send a message (text or media)
router.post('/', (req: any, res: any) => {
  const myId = (req as any).user.id;
  const { conversationId, content, mediaUrl, mediaType } = req.body || {};

  if (!conversationId) return res.status(400).json({ error: 'conversationId required' });
  if (!get('SELECT 1 FROM conversation_members WHERE conversationId = ? AND userId = ?', [conversationId, myId])) {
    return res.status(403).json({ error: 'Not a member' });
  }

  const msgId = uuid();
  const createdAt = now();
  run(
    'INSERT INTO messages (id, conversationId, senderId, content, mediaUrl, mediaType, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [msgId, conversationId, myId, String(content || ''), mediaUrl || null, mediaType || null, createdAt]
  );

  const msg = get(
    `SELECT m.*, u.username, u.displayName, u.avatarColor, u.status
     FROM messages m JOIN users u ON m.senderId = u.id WHERE m.id = ?`,
    [msgId]
  );
  res.json({ message: msg });
});

export default router;