/**
 * Upload controller: Supabase Storage when configured, else disk; return public URL.
 */
const { successResponse } = require('../../utils/response');
const { BadRequestError } = require('../../utils/errors');
const env = require('../../config/env');
const uploadService = require('./upload.service');

function getBaseUrl(req) {
  if (env.publicBaseUrl) return env.publicBaseUrl.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

async function upload(req, res, next) {
  try {
    if (!req.file) {
      throw new BadRequestError('No file in request. Send multipart/form-data with field "file".');
    }

    let url;
    if (uploadService.isSupabaseConfigured() && req.file.buffer) {
      url = await uploadService.uploadToSupabase(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
    } else {
      const filename = req.file.filename;
      const baseUrl = getBaseUrl(req);
      url = `${baseUrl}/uploads/${filename}`;
    }

    return successResponse(res, 201, { url });
  } catch (err) {
    next(err);
  }
}

module.exports = { upload };
