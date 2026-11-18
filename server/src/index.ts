import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { Server } from 'socket.io';
import { attachSocket } from './socket';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import conversationRoutes from './routes/conversations';
import messageRoutes from './routes/messages';
import uploadRoutes from './routes/upload';

const app = express();
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  })
);
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);

// Serve uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));



const io = new Server(server, {
  cors: { origin: true, credentials: true }
});

attachSocket(io);

export { app, server, io };
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
