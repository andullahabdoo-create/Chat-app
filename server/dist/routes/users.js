"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../auth");
const auth_2 = require("../auth");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
router.get('/search', (req, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    let users = (0, db_1.all)('SELECT id, username, displayName, avatarColor, status, lastSeen FROM users');
    if (q) {
        users = users.filter((u) => u.username.toLowerCase().includes(q) ||
            (u.displayName || '').toLowerCase().includes(q));
    }
    res.json({ users: users.slice(0, 50).map(auth_2.userToPublic) });
});
router.get('/:id', (req, res) => {
    const user = (0, db_1.get)('SELECT id, username, displayName, avatarColor, status, lastSeen FROM users WHERE id = ?', [req.params.id]);
    if (!user)
        return res.status(404).json({ error: 'User not found' });
    res.json({ user: (0, auth_2.userToPublic)(user) });
});
exports.default = router;
//# sourceMappingURL=users.js.map