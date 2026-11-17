"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userToPublic = exports.signToken = exports.comparePassword = exports.hashPassword = void 0;
exports.authMiddleware = authMiddleware;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("./db");
const hashPassword = (pw) => bcryptjs_1.default.hashSync(pw, 10);
exports.hashPassword = hashPassword;
const comparePassword = (pw, hash) => bcryptjs_1.default.compareSync(pw, hash);
exports.comparePassword = comparePassword;
const signToken = (userId) => jsonwebtoken_1.default.sign({ sub: userId }, process.env.JWT_SECRET || 'dev-secret', {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d')
});
exports.signToken = signToken;
function authMiddleware(req, res, next) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'dev-secret');
        const user = (0, db_1.get)('SELECT id, username, displayName, avatarColor, status, lastSeen FROM users WHERE id = ?', [payload.sub]);
        if (!user)
            return res.status(401).json({ error: 'Unauthorized' });
        req.user = user;
        next();
    }
    catch {
        res.status(401).json({ error: 'Invalid token' });
    }
}
const userToPublic = (u) => ({
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatarColor: u.avatarColor,
    status: u.status,
    lastSeen: u.lastSeen
});
exports.userToPublic = userToPublic;
//# sourceMappingURL=auth.js.map