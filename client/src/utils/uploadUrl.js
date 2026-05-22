import { getUploadBaseUrl } from './apiConfig';

/** 
 * Build absolute URL for server static files under `/uploads`.
 * Handles absolute system paths (e.g. from Vercel /tmp or Windows C:\) 
 * by stripping everything before 'uploads/' or by appending 'uploads/' to /tmp files.
 */
export function uploadUrl(storedPath) {
  if (!storedPath) return null;
  
  // Normalize slashes
  let p = String(storedPath).replace(/\\/g, '/');
  
  // Rule 1: If it's a Vercel /tmp path, we map it to /uploads/filename
  // (Because we have express.static('/tmp') mapped to '/uploads' on the server)
  if (p.startsWith('/tmp/')) {
    p = p.replace('/tmp/', 'uploads/');
  }

  // Rule 2: Extract the 'uploads/...' portion if it exist anywhere in the string
  const idx = p.toLowerCase().indexOf('uploads/');
  if (idx !== -1) {
    p = p.slice(idx);
  } else if (!p.startsWith('uploads/')) {
    // If no 'uploads' in string and not starting with it, prepend it
    p = `uploads/${p.replace(/^\//, '')}`;
  }
  
  const base = getUploadBaseUrl();
  // Ensure we don't double slash
  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = p.replace(/^\/+/, '');
  
  return `${cleanBase}/${cleanPath}`;
}
