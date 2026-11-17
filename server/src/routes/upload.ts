import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../auth';
import { uuid } from '../utils';

const router = Router();
router.use(authMiddleware);

const storage = path.join(process.cwd(), 'uploads');
fs.mkdirSync(storage, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.doc', '.docx', '.txt', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Unsupported file type'));
  }
});

router.post('/', upload.single('file'), (req: any, res: any) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const ext = path.extname(req.file.originalname);
  const filename = uuid() + ext;
  fs.writeFileSync(path.join(storage, filename), req.file.buffer);
  res.json({
    url: `/uploads/${filename}`,
    mediaType: req.file.mimetype.startsWith('image/') ? 'image' : 'file'
  });
});

export default router;
