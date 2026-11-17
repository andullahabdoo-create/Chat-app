"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLORS = void 0;
exports.uuid = uuid;
exports.now = now;
exports.sanitizeFileName = sanitizeFileName;
exports.colorFor = colorFor;
const crypto_1 = __importDefault(require("crypto"));
function uuid() {
    return crypto_1.default.randomUUID();
}
function now() {
    return Date.now();
}
function sanitizeFileName(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
exports.COLORS = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];
function colorFor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return exports.COLORS[Math.abs(hash) % exports.COLORS.length];
}
//# sourceMappingURL=utils.js.map