// Item photos live in the Supabase Storage bucket "item-images".
// (The brief allows any approved image host; this keeps everything inside the
// database account the university approved, with no extra service to configure.)
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const BUCKET = process.env.SUPABASE_BUCKET || 'item-images';
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
const configured = Boolean(url && key);

let client = null;
if (configured) {
  try {
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  } catch (error) {
    // a typo in SUPABASE_URL must degrade to a 503, not crash the whole API
    console.error(`Photo storage is misconfigured: ${error.message}`);
    client = null;
  }
}

async function uploadImage(file) {
  if (!configured || !client) {
    const error = new Error('Photo storage is not configured on the server');
    error.status = 503;
    throw error;
  }

  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

  const { error } = await client.storage.from(BUCKET).upload(filename, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });
  if (error) {
    const uploadError = new Error(`Photo upload failed: ${error.message}`);
    uploadError.status = 502;
    throw uploadError;
  }

  const { data } = client.storage.from(BUCKET).getPublicUrl(filename);
  return { url: data.publicUrl, publicId: filename };
}

async function destroyImage(publicId) {
  if (!configured || !publicId) return;
  try {
    await client.storage.from(BUCKET).remove([publicId]);
  } catch (error) {
    console.warn('Could not delete image:', error.message);
  }
}

// Uploads use the service key, which bypasses storage RLS, and getPublicUrl only
// builds a string. So a private bucket accepts the upload and returns a URL that
// the browser cannot fetch. Check once at boot and say it loudly.
async function checkBucket() {
  if (!client) return null;
  try {
    const { data, error } = await client.storage.getBucket(BUCKET);
    if (error) {
      console.error(`Storage bucket "${BUCKET}" is not readable: ${error.message}`);
      return false;
    }
    if (!data || data.public !== true) {
      console.error(
        `WARNING: storage bucket "${BUCKET}" is PRIVATE. Photos will upload but never display.\n` +
        `  Fix: update storage.buckets set public = true where id = '${BUCKET}';`
      );
      return false;
    }
    console.log(`Storage bucket "${BUCKET}" is public: photos will render.`);
    return true;
  } catch (error) {
    console.error('Storage bucket check failed:', error.message);
    return null;
  }
}

module.exports = { uploadImage, destroyImage, checkBucket, configured };
