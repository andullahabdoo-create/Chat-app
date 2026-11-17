import { Router } from 'express';
import { get, all } from '../db';
import { authMiddleware } from '../auth';
import { userToPublic } from '../auth';

const router = Router();
router.use(authMiddleware);

router.get('/search', (req: any, res: any) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  let users: any[] = all('SELECT id, username, displayName, avatarColor, status, lastSeen FROM users');
  if (q) {
    users = users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.displayName || '').toLowerCase().includes(q)
    );
  }
  res.json({ users: users.slice(0, 50).map(userToPublic) });
});

router.get('/:id', (req: any, res: any) => {
  const user = get('SELECT id, username, displayName, avatarColor, status, lastSeen FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: userToPublic(user) });
});

export default router;
