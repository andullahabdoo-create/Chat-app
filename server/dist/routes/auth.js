"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../auth");
const utils_1 = require("../utils");
const router = (0, express_1.Router)();
router.post('/register', (req, res) => {
    const { username, password, displayName: displayNameRaw } = req.body || {};
    const uname = String(username || '').trim().toLowerCase();
    const pw = String(password || '');
    if (!/^[a-z0-9_]{3,20}$/.test(uname)) {
        return res.status(400).json({ error: 'Username must be 3-20 chars (a-z, 0-9, _)' });
    }
    if (pw.length < 6)
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if ((0, db_1.get)('SELECT id FROM users WHERE username = ?', [uname])) {
        return res.status(409).json({ error: 'Username already taken' });
    }
    const id = (0, utils_1.uuid)();
    const displayName = String(displayNameRaw || uname);
    (0, db_1.run)('INSERT INTO users (id, username, passwordHash, displayName, avatarColor, status, lastSeen, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, uname, (0, auth_1.hashPassword)(pw), displayName, '#3B82F6', 'online', null, (0, utils_1.now)()]);
    const user = (0, db_1.get)('SELECT id, username, displayName, avatarColor, status, lastSeen FROM users WHERE id = ?', [id]);
    const token = (0, auth_1.signToken)(id);
    res.json({ token, user: (0, auth_1.userToPublic)(user) });
});
router.post('/login', (req, res) => {
    const { username, password } = req.body || {};
    const user = (0, db_1.get)('SELECT * FROM users WHERE username = ?', [String(username || '').trim().toLowerCase()]);
    if (!user || !(0, auth_1.comparePassword)(String(password || ''), user.passwordHash)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    (0, db_1.run)('UPDATE users SET status = ?, lastSeen = ? WHERE id = ?', ['online', (0, utils_1.now)(), user.id]);
    const token = (0, auth_1.signToken)(user.id);
    res.json({ token, user: (0, auth_1.userToPublic)(user) });
});
router.get('/me', auth_1.authMiddleware, (req, res) => {
    const user = (0, db_1.get)('SELECT id, username, displayName, avatarColor, status, lastSeen FROM users WHERE id = ?', [req.user.id]);
    res.json({ user: (0, auth_1.userToPublic)(user) });
});
router.get('/', auth_1.authMiddleware, (req, res) => {
    const users = (0, db_1.all)('SELECT id, username, displayName, avatarColor, status, lastSeen FROM users ORDER BY displayName || username LIMIT 50');
    res.json({ users });
});
exports.default = router;
//# sourceMappingURL=auth.js.map