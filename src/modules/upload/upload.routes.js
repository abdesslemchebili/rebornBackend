/**
 * Upload route: POST /api/v1/upload (multipart/form-data, field "file").
 * Uses Supabase Storage when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set; otherwise saves to disk.
 */
const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const { authenticate } = require('../../middleware/auth');
const uploadController = require('./upload.controller');
const uploadService = require('./upload.service');
const { BadRequestError } = require('../../utils/errors');

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXT = /\.(jpe?g|png|gif|webp|pdf)$/i;

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (ALLOWED_EXT.test(ext)) return cb(null, true);
  cb(new BadRequestError('File type not allowed. Use image (jpg, png, gif, webp) or PDF.'));
};

// Supabase: use memory so we have a buffer to upload. Disk: save to uploads/.
const storage = uploadService.isSupabaseConfigured()
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
      filename: (_req, file, cb) => {
        const ext = (path.extname(file.originalname || '') || '.bin').toLowerCase();
        cb(null, uploadService.safeStoragePath(file.originalname));
      },
    });

const uploadMw = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

const router = express.Router();
router.post('/', authenticate, uploadMw.single('file'), uploadController.upload);

module.exports = router;
