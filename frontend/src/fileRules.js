// Shared client-side file validation rules. Mirrors backend limits
// (backend/lib/handler.js): .txt/.pdf only, 5MB max per file.
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_EXT = ['.txt', '.pdf'];
export const MAX_BATCH_FILES = 10;

export function isAllowedFile(name = '') {
  const lower = name.toLowerCase();
  return ALLOWED_EXT.some((ext) => lower.endsWith(ext));
}

// Returns an error string if the file is invalid, otherwise ''.
export function fileError(f) {
  if (!f) return 'No file.';
  if (!isAllowedFile(f.name)) return 'Unsupported file type. Only .txt and .pdf are accepted.';
  if (f.size > MAX_FILE_BYTES) return 'File is too large. Maximum size is 5MB.';
  return '';
}
