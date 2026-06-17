// server.js
// Runnable local Express server for DocFlow AI.
// Exposes POST /api/extract (JSON body or multipart file upload).
// Mirrors the logic used by the Vercel serverless function in /api/extract.js.

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');

const { handleExtract, MAX_FILE_BYTES } = require('./lib/handler');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Security middleware ---
app.use(helmet());

// CORS: allow configured origin(s) in production; permissive in dev.
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // No allow-list configured -> allow all (dev convenience).
      if (allowedOrigins.length === 0) return callback(null, true);
      // Allow same-origin / curl (no origin header) and listed origins.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['POST', 'GET', 'OPTIONS'],
  })
);

// Parse JSON bodies with a sane cap (text-only path).
app.use(express.json({ limit: '6mb' }));

// Rate limit the extract endpoint.
const extractLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests/min/IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a minute and try again.' },
});

// Multer for multipart file uploads (memory storage, single file).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
});

// --- Routes ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'DocFlow AI' });
});

// Multer error wrapper to return friendly JSON instead of throwing.
function uploadMiddleware(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File is too large. Maximum size is 5MB.' });
      }
      return res.status(400).json({ error: 'File upload failed. Please try again.' });
    }
    return next();
  });
}

app.post('/api/extract', extractLimiter, uploadMiddleware, async (req, res) => {
  try {
    const docType = req.body ? req.body.docType : undefined;
    const text = req.body ? req.body.text : undefined;
    const file = req.file
      ? {
          buffer: req.file.buffer,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        }
      : null;

    const result = await handleExtract({ text, docType, file });
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.status(200).json(result.data);
  } catch (e) {
    // Never leak internals.
    return res.status(500).json({ error: 'Unexpected server error. Please try again.' });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`DocFlow AI backend listening on http://localhost:${PORT}`);
});

module.exports = app;
