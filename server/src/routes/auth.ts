import { Router, Request, Response } from 'express';
import { db, get, run, all } from '../db';
import { hashPassword, comparePassword, signToken, userToPublic, authMiddleware } from '../auth';
import { uuid, now } from '../utils';

const router = Router();

router.post('/register', (req: Request, res: Response) => {
  const { username, password, displayName: displayNameRaw } = req.body || {};
  const uname = String(username || '').trim().toLowerCase();
  const pw = String(password || '');
  if (!/^[a-z0-9_]{3,20}$/.test(uname)) {
    return res.status(400).json({ error: 'Username must be 3-20 chars (a-z, 0-9, _)' });
  }
  if (pw.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (get('SELECT id FROM users WHERE username = ?', [uname])) {
    return res.status(409).json({ error: 'Username already taken' });
  }
  const id = uuid();
  const displayName = String(displayNameRaw || uname);
  run('INSERT INTO users (id, username, passwordHash, displayName, avatarColor, status, lastSeen, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, uname, hashPassword(pw), displayName, '#3B82F6', 'online', null, now()]);

  const user = get('SELECT id, username, displayName, avatarColor, status, lastSeen FROM users WHERE id = ?', [id]);
  const token = signToken(id);
  res.json({ token, user: userToPublic(user) });
});

router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body || {};
  const user = get('SELECT * FROM users WHERE username = ?', [String(username || '').trim().toLowerCase()]);
  if (!user || !comparePassword(String(password || ''), user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  run('UPDATE users SET status = ?, lastSeen = ? WHERE id = ?', ['online', now(), user.id]);
  const token = signToken(user.id);
  res.json({ token, user: userToPublic(user) });
});

router.get('/me', authMiddleware, (req: any, res: Response) => {
  const user = get('SELECT id, username, displayName, avatarColor, status, lastSeen FROM users WHERE id = ?', [(req as any).user.id]);
  res.json({ user: userToPublic(user) });
});

router.get('/', authMiddleware, (req: any, res: Response) => {
  const users = all('SELECT id, username, displayName, avatarColor, status, lastSeen FROM users ORDER BY displayName || username LIMIT 50');
  res.json({ users });
});

export default router;
