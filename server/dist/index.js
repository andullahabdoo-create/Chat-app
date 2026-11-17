"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const socket_io_1 = require("socket.io");
const socket_1 = require("./socket");
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const conversations_1 = __importDefault(require("./routes/conversations"));
const messages_1 = __importDefault(require("./routes/messages"));
const upload_1 = __importDefault(require("./routes/upload"));
const app = (0, express_1.default)();
exports.app = app;
app.use((0, cors_1.default)({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/conversations', conversations_1.default);
app.use('/api/messages', messages_1.default);
app.use('/api/upload', upload_1.default);
// Serve uploads
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
const server = app.listen(Number(process.env.PORT || 4000), () => {
    console.log(`Server listening on port ${process.env.PORT || 4000}`);
});
exports.server = server;
const io = new socket_io_1.Server(server, {
    cors: { origin: true, credentials: true }
});
exports.io = io;
(0, socket_1.attachSocket)(io);
//# sourceMappingURL=index.js.map