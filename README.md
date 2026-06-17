<div align="center">

# 📄 DocFlow AI

### Universal document automation — upload, extract, done.

Turn invoices, contracts, emails, and any document into clean **structured data** in seconds.
Upload a PDF/TXT or paste text, pick a document type, and let AI do the parsing — then export to CSV or JSON.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)

</div>

---

## ✨ Features

- 📥 **Drag & drop upload** — `.txt` and `.pdf`, or paste raw text
- 🗂️ **Four document types** — Invoice, Contract, Email/Lead, Generic, each with its own extraction schema
- 🧾 **Structured results** — clean cards and tables, not a wall of JSON
- 📦 **Batch processing** — drop up to **10 files at once**, processed 3 at a time with live per-file progress
- 🧩 **Collapsible per-file results** — each document gets its own labeled, expandable card
- 📤 **Export** — single or whole-batch, to **CSV** or **JSON** (invoice CSV expands one row per line item)
- 🛡️ **Resilient batches** — one bad file fails on its own; the rest keep going
- 📱 **Mobile responsive** & clean, branded UI
- 🔒 **Secure by design** — API key never touches the browser

---

## 🧠 What it extracts

| Document type | Extracted fields |
|---------------|------------------|
| **Invoice / Receipt** | vendor, date, line items (description / qty / unit price / amount), subtotal, tax, total |
| **Contract** | parties, key dates, obligations, risk flags (severity + note), summary |
| **Email / Lead** | sender intent, contact info, urgency, suggested next action, category |
| **Generic** | key entities, dates, numbers, summary, action items |

---

## 🏗️ Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express (local) · Vercel serverless functions (`/api`) |
| AI extraction | Anthropic Claude (`claude-haiku-4-5`) via `@anthropic-ai/sdk`, forced tool-use for strict JSON |
| Files | `pdf-parse` for PDF text, `multer` for uploads |

The frontend orchestrates batch jobs **client-side** against a single `/api/extract` endpoint — no extra backend surface, no key exposure.

---

## 🚀 Quick start

> **Prerequisites:** Node.js 18+ and an Anthropic API key.

You'll need **two terminals** — one for the backend, one for the frontend.

### 1. Backend

```bash
cd backend
npm install
```

Create `backend/.env` with your key (the server auto-loads it via `dotenv`):

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Then start it:

```bash
npm start          # → http://localhost:3001  (health: GET /api/health)
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev        # → http://localhost:5173
```

The Vite dev server proxies `/api/*` to the backend — no extra config needed. Open the URL and go.

---

## ⚙️ Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ | Anthropic API key — **server-side only**, never sent to the browser |
| `CORS_ORIGIN` | — | Comma-separated allow-list of origins. Empty = allow all (dev) |
| `PORT` | — | Local Express port (default `3001`) |

Only `.env.example` is committed. Your real `.env` is gitignored. **Never commit a key.**

---

## 📁 Project structure

```
DocFlow-AI/
├── api/
│   └── extract.js              # Vercel serverless function (POST /api/extract)
├── backend/
│   ├── lib/
│   │   ├── schemas.js          # Per-docType JSON schemas
│   │   ├── extractor.js        # Claude integration (tool-use → strict JSON)
│   │   └── handler.js          # Shared validation + PDF/TXT text extraction
│   ├── server.js               # Local Express server (helmet, CORS, rate-limit)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Logo.jsx
│   │   │   ├── Uploader.jsx     # Single-file drop + paste
│   │   │   ├── Results.jsx      # Per-type result views (+ reusable ResultView)
│   │   │   ├── BatchUploader.jsx# Multi-file drop + queue
│   │   │   └── BatchResults.jsx # Collapsible per-file cards + Export All
│   │   ├── App.jsx             # Single / Batch modes, concurrency runner
│   │   ├── fileRules.js        # Shared file validation (.txt/.pdf, 5MB, max 10)
│   │   ├── docTypes.js
│   │   └── export.js           # CSV / JSON export (single + batch)
│   └── ...
├── vercel.json
├── .env.example
└── README.md
```

---

## ☁️ Deploy to Vercel

The Express logic is also exposed as a serverless function at `/api/extract.js`, and the frontend ships as static files.

1. Push this repo to GitHub.
2. Import the project in Vercel — `vercel.json` already configures the build, output (`frontend/dist`), and `/api` functions.
3. Add the env var in **Project → Settings → Environment Variables**:
   - `ANTHROPIC_API_KEY` = your key
   - *(optional)* `CORS_ORIGIN` = `https://your-app.vercel.app`
4. Deploy.

Because the frontend calls `/api/extract` with a relative path, it works identically in dev (Vite proxy) and prod (same origin).

```bash
# or via CLI
npm i -g vercel
vercel
vercel env add ANTHROPIC_API_KEY
vercel --prod
```

---

## 🔒 Security

- API key read from `process.env.ANTHROPIC_API_KEY` **server-side only** — never reaches the client.
- Uploads validated by extension (`.txt`, `.pdf`) and capped at **5MB** per file.
- User text is sanitized (control chars stripped) and length-capped before hitting the model.
- Extract endpoint is **rate-limited** (20 req/min/IP on the Express server).
- Helmet security headers + configurable CORS.

---

## 📝 Notes & limitations

- **Scanned PDFs:** `pdf-parse` reads embedded text only — image-only/scanned PDFs return no text (the UI explains this). OCR is out of scope.
- **Serverless rate limiting** is best-effort per warm instance; for strict production limits, front the function with a gateway or shared store (e.g. Upstash).
- No automated test suite (portfolio/demo scope).

---

<div align="center">

**Powered by [Jesxen](https://github.com/jesxen)** · Built for real-world document automation.

</div>
