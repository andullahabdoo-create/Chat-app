import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { get, run } from './db';

export const hashPassword = (pw: string) => bcrypt.hashSync(pw, 10);
export const comparePassword = (pw: string, hash: string) => bcrypt.compareSync(pw, hash);

export const signToken = (userId: string) =>
  jwt.sign({ sub: userId }, process.env.JWT_SECRET || 'dev-secret', {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any
  });

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
    const user = get('SELECT id, username, displayName, avatarColor, status, lastSeen FROM users WHERE id = ?', [payload.sub]);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    (req as any).user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export const userToPublic = (u: any) => ({
  id: u.id,
  username: u.username,
  displayName: u.displayName,
  avatarColor: u.avatarColor,
  status: u.status,
  lastSeen: u.lastSeen
});