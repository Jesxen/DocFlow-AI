// handler.js (ESM)
// Framework-agnostic request handling for the /api/extract endpoint: validates
// inputs, extracts text from uploaded files (PDF/TXT) or raw text, then
// delegates to the extractor.
//
// ESM mirror of backend/lib/handler.js (see frontend/lib/schemas.js header).

import { extract, MAX_INPUT_CHARS } from './extractor.js';
import { DOC_TYPES } from './schemas.js';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXT = ['.txt', '.pdf'];

function hasAllowedExtension(filename = '') {
  const lower = String(filename).toLowerCase();
  return ALLOWED_EXT.some((ext) => lower.endsWith(ext));
}

function isPdf(filename = '', mimetype = '') {
  return (
    String(filename).toLowerCase().endsWith('.pdf') ||
    String(mimetype).toLowerCase().includes('pdf')
  );
}

// Import the inner implementation directly. The pdf-parse package's index.js
// runs a debug block on load when `module.parent` is falsy (which happens under
// ESM import), crashing with ENOENT. The lib entry has no such block.
async function extractPdfText(buffer) {
  const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
  const result = await pdfParse(buffer);
  return result && typeof result.text === 'string' ? result.text : '';
}

function validateDocType(docType) {
  return DOC_TYPES.includes(docType);
}

// Inputs: { text, docType, file } where file = { buffer, originalname, mimetype, size } | null
// Returns { ok, status, data?|error }
export async function handleExtract({ text, docType, file }) {
  if (!validateDocType(docType)) {
    return {
      ok: false,
      status: 400,
      error: 'Please select a valid document type (invoice, contract, email, or generic).',
    };
  }

  let sourceText = typeof text === 'string' ? text : '';

  if (file && file.buffer) {
    if (file.size > MAX_FILE_BYTES || file.buffer.length > MAX_FILE_BYTES) {
      return { ok: false, status: 413, error: 'File is too large. Maximum size is 5MB.' };
    }
    if (!hasAllowedExtension(file.originalname)) {
      return {
        ok: false,
        status: 415,
        error: 'Unsupported file type. Only .txt and .pdf files are accepted.',
      };
    }

    try {
      if (isPdf(file.originalname, file.mimetype)) {
        sourceText = await extractPdfText(file.buffer);
        if (!sourceText || !sourceText.trim()) {
          return {
            ok: false,
            status: 422,
            error:
              'No text could be extracted from this PDF. It may be a scanned image. Try pasting the text instead.',
          };
        }
      } else {
        sourceText = file.buffer.toString('utf-8');
      }
    } catch (e) {
      return {
        ok: false,
        status: 422,
        error: 'Could not read the uploaded file. Please check it and try again.',
      };
    }
  }

  if (!sourceText || !sourceText.trim()) {
    return {
      ok: false,
      status: 400,
      error: 'Please provide a document by uploading a file or pasting text.',
    };
  }

  const result = await extract({ text: sourceText, docType });
  if (!result.ok) {
    return { ok: false, status: result.status || 502, error: result.error };
  }

  return { ok: true, status: 200, data: { docType, result: result.data } };
}

export {
  validateDocType,
  hasAllowedExtension,
  isPdf,
  MAX_FILE_BYTES,
  ALLOWED_EXT,
  MAX_INPUT_CHARS,
};
