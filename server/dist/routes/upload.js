"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../auth");
const utils_1 = require("../utils");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
const storage = path_1.default.join(process.cwd(), 'uploads');
fs_1.default.mkdirSync(storage, { recursive: true });
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.doc', '.docx', '.txt', '.zip'];
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext))
            cb(null, true);
        else
            cb(new Error('Unsupported file type'));
    }
});
router.post('/', upload.single('file'), (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: 'No file uploaded' });
    const ext = path_1.default.extname(req.file.originalname);
    const filename = (0, utils_1.uuid)() + ext;
    fs_1.default.writeFileSync(path_1.default.join(storage, filename), req.file.buffer);
    res.json({
        url: `/uploads/${filename}`,
        mediaType: req.file.mimetype.startsWith('image/') ? 'image' : 'file'
    });
});
exports.default = router;
//# sourceMappingURL=upload.js.map