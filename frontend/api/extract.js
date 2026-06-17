// api/extract.js (ESM) — Vercel serverless function for POST /api/extract.
// Handles JSON bodies ({ text, docType }) and multipart form uploads
// (file + docType). Shares extraction logic with ../lib/handler.js.
//
// The Vercel project Root Directory is `frontend/`, so this function and the
// code under ../lib are the production extraction path. The Express server in
// /backend mirrors it for local development.

import Busboy from 'busboy';
import { handleExtract, MAX_FILE_BYTES } from '../lib/handler.js';

// --- Lightweight in-memory rate limiter (best-effort for serverless) ---
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 20;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip) || { count: 0, start: now };
  if (now - entry.start > RATE_WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  hits.set(ip, entry);
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (now - v.start > RATE_WINDOW_MS) hits.delete(k);
    }
  }
  return entry.count > RATE_MAX;
}

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : 'unknown';
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let tooLarge = false;
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 6 * 1024 * 1024) {
        tooLarge = true;
        reject(new Error('PAYLOAD_TOO_LARGE'));
      }
    });
    req.on('end', () => {
      if (tooLarge) return;
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(new Error('INVALID_JSON'));
      }
    });
    req.on('error', reject);
  });
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    let busboy;
    try {
      busboy = Busboy({ headers: req.headers, limits: { fileSize: MAX_FILE_BYTES, files: 1 } });
    } catch (e) {
      return reject(new Error('INVALID_MULTIPART'));
    }

    const fields = {};
    let file = null;
    let fileTooLarge = false;

    busboy.on('field', (name, val) => {
      fields[name] = val;
    });

    busboy.on('file', (name, stream, info) => {
      const chunks = [];
      stream.on('limit', () => {
        fileTooLarge = true;
        stream.resume();
      });
      stream.on('data', (d) => chunks.push(d));
      stream.on('end', () => {
        if (!fileTooLarge) {
          const buffer = Buffer.concat(chunks);
          file = {
            buffer,
            originalname: info.filename || 'upload',
            mimetype: info.mimeType || info.mimetype || 'application/octet-stream',
            size: buffer.length,
          };
        }
      });
    });

    busboy.on('error', () => reject(new Error('MULTIPART_ERROR')));
    busboy.on('finish', () => {
      if (fileTooLarge) return reject(new Error('FILE_TOO_LARGE'));
      resolve({ fields, file });
    });

    req.pipe(busboy);
  });
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  // Basic CORS. CORS_ORIGIN can be a comma-separated allow-list.
  const allowed = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = req.headers.origin;
  if (allowed.length === 0) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  if (rateLimited(getClientIp(req))) {
    return sendJson(res, 429, { error: 'Too many requests. Please wait a minute and try again.' });
  }

  const contentType = String(req.headers['content-type'] || '');

  let text;
  let docType;
  let file = null;

  try {
    if (contentType.includes('multipart/form-data')) {
      const { fields, file: parsedFile } = await parseMultipart(req);
      text = fields.text;
      docType = fields.docType;
      file = parsedFile;
    } else {
      const body = await readJsonBody(req);
      text = body.text;
      docType = body.docType;
    }
  } catch (e) {
    const msg = e && e.message;
    if (msg === 'PAYLOAD_TOO_LARGE' || msg === 'FILE_TOO_LARGE') {
      return sendJson(res, 413, { error: 'File is too large. Maximum size is 5MB.' });
    }
    return sendJson(res, 400, { error: 'Could not read the request. Please try again.' });
  }

  try {
    const result = await handleExtract({ text, docType, file });
    return sendJson(res, result.ok ? 200 : result.status, result.ok ? result.data : { error: result.error });
  } catch (e) {
    return sendJson(res, 500, { error: 'Unexpected server error. Please try again.' });
  }
}

// Tell Vercel not to parse the body — we handle JSON and multipart ourselves.
export const config = {
  api: {
    bodyParser: false,
  },
};
