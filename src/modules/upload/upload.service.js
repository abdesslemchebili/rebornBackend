/**
 * Upload service: Supabase Storage when configured, otherwise returns local path for disk storage.
 */
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const env = require('../../config/env');

const ALLOWED_EXT = /\.(jpe?g|png|gif|webp|pdf)$/i;

function getSupabase() {
  if (!env.supabase?.url || !env.supabase?.serviceRoleKey) return null;
  return createClient(env.supabase.url, env.supabase.serviceRoleKey);
}

function safeStoragePath(originalName) {
  const ext = (path.extname(originalName || '') || '.bin').toLowerCase();
  const base = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return base + ext;
}

/**
 * Upload buffer to Supabase Storage. Returns public URL or throws.
 */
async function uploadToSupabase(buffer, originalName, contentType) {
  const ext = path.extname(originalName || '').toLowerCase();
  if (!ALLOWED_EXT.test(ext)) throw new Error('File type not allowed');
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const filePath = safeStoragePath(originalName);
  const bucket = env.supabase.bucket;
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, buffer, {
      contentType: contentType || undefined,
      upsert: false,
    });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
}

function isSupabaseConfigured() {
  return !!(env.supabase?.url && env.supabase?.serviceRoleKey);
}

module.exports = { uploadToSupabase, isSupabaseConfigured, safeStoragePath };
