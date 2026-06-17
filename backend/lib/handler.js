// handler.js
// Framework-agnostic request handling for the /api/extract endpoint.
// Validates inputs, extracts text from uploaded files (PDF/TXT) or raw text,
// then delegates to the extractor. Used by both the Express server and the
// Vercel serverless function.

const { extract, MAX_INPUT_CHARS } = require('./extractor');
const { DOC_TYPES } = require('./schemas');

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

// Lazy-require pdf-parse so a missing optional dep never breaks text-only flows.
async function extractPdfText(buffer) {
  // eslint-disable-next-line global-require
  const pdfParse = require('pdf-parse');
  const result = await pdfParse(buffer);
  return result && typeof result.text === 'string' ? result.text : '';
}

// Validate docType against the allow-list.
function validateDocType(docType) {
  return DOC_TYPES.includes(docType);
}

// Core handler.
// Inputs:
//   { text, docType, file }  where file = { buffer, originalname, mimetype, size } | null
// Returns { ok, status, data?|error }
async function handleExtract({ text, docType, file }) {
  if (!validateDocType(docType)) {
    return {
      ok: false,
      status: 400,
      error: 'Please select a valid document type (invoice, contract, email, or generic).',
    };
  }

  let sourceText = typeof text === 'string' ? text : '';

  if (file && file.buffer) {
    // Validate file size.
    if (file.size > MAX_FILE_BYTES || file.buffer.length > MAX_FILE_BYTES) {
      return { ok: false, status: 413, error: 'File is too large. Maximum size is 5MB.' };
    }
    // Validate file type by extension AND mimetype.
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
        // Treat as plain text.
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

module.exports = {
  handleExtract,
  validateDocType,
  hasAllowedExtension,
  isPdf,
  MAX_FILE_BYTES,
  ALLOWED_EXT,
  MAX_INPUT_CHARS,
};
