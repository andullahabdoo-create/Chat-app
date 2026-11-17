import { Router } from 'express';
import { get, run, all, transaction } from '../db';
import { authMiddleware } from '../auth';
import { uuid, now, colorFor } from '../utils';

const router = Router();
router.use(authMiddleware);

function participantsOf(conversationId: string) {
  return all(
    `SELECT u.id, u.username, u.displayName, u.avatarColor, u.status, u.lastSeen
     FROM users u JOIN conversation_members cm ON u.id = cm.userId
     WHERE cm.conversationId = ?`,
    [conversationId]
  );
}

// Create or fetch a direct message conversation
router.post('/', (req: any, res: any) => {
  const { participantId } = req.body || {};
  const myId = (req as any).user.id;
  if (!participantId) return res.status(400).json({ error: 'participantId required' });
  if (participantId === myId) return res.status(400).json({ error: 'Cannot start DM with yourself' });
  if (!get('SELECT id FROM users WHERE id = ?', [participantId])) {
    return res.status(404).json({ error: 'Participant not found' });
  }

  const existing = all(
    `SELECT c.id FROM conversations c
     JOIN conversation_members cm1 ON c.id = cm1.conversationId
     JOIN conversation_members cm2 ON c.id = cm2.conversationId
     WHERE c.type = 'dm' AND cm1.userId = ? AND cm2.userId = ?`,
    [myId, participantId]
  );

  if (existing.length > 0) {
    return res.json({ conversation: { id: existing[0].id, type: 'dm', participants: participantsOf(existing[0].id) } });
  }

  const convId = uuid();
  transaction(() => {
    run('INSERT INTO conversations (id, type, createdBy, createdAt) VALUES (?, ?, ?, ?)', [convId, 'dm', myId, now()]);
    run('INSERT INTO conversation_members (conversationId, userId, joinedAt) VALUES (?, ?, ?)', [convId, myId, now()]);
    run('INSERT INTO conversation_members (conversationId, userId, joinedAt) VALUES (?, ?, ?)', [convId, participantId, now()]);
  });

  res.json({ conversation: { id: convId, type: 'dm', participants: participantsOf(convId) } });
});

// Create a group conversation
router.post('/group', (req: any, res: any) => {
  const { name, memberIds } = req.body || {};
  const myId = (req as any).user.id;
  const groupName = String(name || '').trim();
  if (!groupName) return res.status(400).json({ error: 'Group name required' });
  if (!Array.isArray(memberIds) || memberIds.length < 1) {
    return res.status(400).json({ error: 'Select at least one member' });
  }

  const unique = Array.from(new Set([...(memberIds as string[]).filter((id) => id !== myId), myId]));
  const convId = uuid();
  transaction(() => {
    run('INSERT INTO conversations (id, type, name, avatarColor, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [convId, 'group', groupName, colorFor(groupName), myId, now()]);
    for (const uid of unique) {
      run('INSERT INTO conversation_members (conversationId, userId, joinedAt) VALUES (?, ?, ?)', [convId, uid, now()]);
    }
  });

  res.json({ conversation: { id: convId, type: 'group', name: groupName, participants: participantsOf(convId) } });
});

// List conversations for the current user with participants, last message and unread count
router.get('/', (req: any, res: any) => {
  const myId = (req as any).user.id;

  const rows = all(
    `SELECT c.id, c.type, c.name, c.avatarColor, cm.joinedAt,
       m.id AS lastMsgId, m.senderId AS lastMsgSenderId, m.content AS lastMsgContent,
       m.mediaUrl AS lastMsgMediaUrl, m.mediaType AS lastMsgMediaType, m.createdAt AS lastMsgCreated,
       (SELECT COUNT(*) FROM messages WHERE conversationId = c.id AND createdAt >
         COALESCE((SELECT lastReadAt FROM conversation_members WHERE conversationId = c.id AND userId = ?), 0)) AS unreadCount
     FROM conversations c
     JOIN conversation_members cm ON c.id = cm.conversationId AND cm.userId = ?
     LEFT JOIN (
       SELECT conversationId, MAX(createdAt) AS maxCreated FROM messages GROUP BY conversationId
     ) latest ON c.id = latest.conversationId
     LEFT JOIN messages m ON c.id = m.conversationId AND m.createdAt = latest.maxCreated
     ORDER BY COALESCE(m.createdAt, 0) DESC
     LIMIT 50`,
    [myId, myId]
  );

  const conversations = rows.map((c: any) => ({
    id: c.id,
    type: c.type,
    name: c.name,
    avatarColor: c.avatarColor,
    createdAt: c.joinedAt,
    unreadCount: c.unreadCount || 0,
    participants: participantsOf(c.id),
    lastMessage: c.lastMsgId
      ? {
          id: c.lastMsgId,
          senderId: c.lastMsgSenderId,
          content: c.lastMsgContent,
          mediaUrl: c.lastMsgMediaUrl,
          mediaType: c.lastMsgMediaType,
          createdAt: c.lastMsgCreated
        }
      : null
  }));

  res.json({ conversations });
});

// Conversation details + participants
router.get('/:id', (req: any, res: any) => {
  const myId = (req as any).user.id;
  const { id } = req.params;
  const conv = get('SELECT * FROM conversations WHERE id = ?', [id]);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  const member = get('SELECT 1 FROM conversation_members WHERE conversationId = ? AND userId = ?', [id, myId]);
  if (!member) return res.status(403).json({ error: 'Not a member' });
  res.json({ conversation: conv, participants: participantsOf(id) });
});

// Mark conversation as read up to now
router.post('/:id/read', (req: any, res: any) => {
  const myId = (req as any).user.id;
  const { id } = req.params;
  run('UPDATE conversation_members SET lastReadAt = ? WHERE conversationId = ? AND userId = ?', [now(), id, myId]);
  res.json({ ok: true });
});

export default router;
