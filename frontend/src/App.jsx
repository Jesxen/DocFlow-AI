import { useState } from 'react';
import Logo from './components/Logo';
import Uploader from './components/Uploader';
import Results from './components/Results';
import BatchUploader from './components/BatchUploader';
import BatchResults from './components/BatchResults';
import { DOC_TYPES } from './docTypes';
import { fileError, MAX_BATCH_FILES } from './fileRules';

const BATCH_CONCURRENCY = 3;

export default function App() {
  const [mode, setMode] = useState('single'); // 'single' | 'batch'
  const [docType, setDocType] = useState('invoice');

  // Single-document state
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // Batch state
  const [items, setItems] = useState([]); // { id, file, status, data, error }
  const [batchError, setBatchError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const canSubmit = !loading && (!!file || text.trim().length > 0);
  const canRunBatch = !processing && items.length > 0;

  function switchMode(next) {
    if (next === mode || loading || processing) return;
    setMode(next);
    setError('');
    setBatchError('');
  }

  function resetType(id) {
    if (loading || processing) return;
    setDocType(id);
    setResult(null);
    setError('');
  }

  // --- Single flow (unchanged behavior) ---
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!file && !text.trim()) {
      setError('Please upload a file or paste some text first.');
      return;
    }

    setLoading(true);
    try {
      let response;
      if (file) {
        const form = new FormData();
        form.append('docType', docType);
        form.append('file', file);
        response = await fetch('/api/extract', { method: 'POST', body: form });
      } else {
        response = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ docType, text }),
        });
      }

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error || 'Something went wrong. Please try again.');
        return;
      }

      setResult({ docType: payload.docType || docType, data: payload.result });
    } catch (err) {
      setError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  // --- Batch flow ---
  function addFiles(fileList) {
    if (processing) return;
    setBatchError('');
    const incoming = Array.from(fileList || []);
    setItems((prev) => {
      const next = [...prev];
      for (const f of incoming) {
        if (next.length >= MAX_BATCH_FILES) {
          setBatchError(`Maximum ${MAX_BATCH_FILES} files per batch.`);
          break;
        }
        const err = fileError(f);
        if (err) {
          setBatchError(`"${f.name}" skipped — ${err.toLowerCase()}`);
          continue;
        }
        // De-dupe by name + size.
        if (next.some((it) => it.file.name === f.name && it.file.size === f.size)) continue;
        next.push({
          id: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          file: f,
          status: 'queued',
          data: null,
          error: '',
        });
      }
      return next;
    });
  }

  function removeItem(id) {
    if (processing) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function setItemState(id, patch) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  async function extractItem(item) {
    setItemState(item.id, { status: 'processing', error: '' });
    try {
      const form = new FormData();
      form.append('docType', docType);
      form.append('file', item.file);
      const res = await fetch('/api/extract', { method: 'POST', body: form });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setItemState(item.id, { status: 'error', error: payload.error || 'Extraction failed.' });
      } else {
        setItemState(item.id, { status: 'done', data: payload.result });
      }
    } catch {
      setItemState(item.id, { status: 'error', error: 'Could not reach the server.' });
    }
  }

  async function runBatch() {
    if (items.length === 0) {
      setBatchError('Add at least one file to process.');
      return;
    }
    setBatchError('');
    setProcessing(true);
    setProgress({ done: 0, total: items.length });
    // Reset any prior run.
    setItems((prev) => prev.map((it) => ({ ...it, status: 'queued', data: null, error: '' })));

    const queue = items.slice();
    let cursor = 0;
    let completed = 0;

    async function worker() {
      while (cursor < queue.length) {
        const current = queue[cursor++];
        await extractItem(current); // one file's failure never throws — batch continues
        completed += 1;
        setProgress({ done: completed, total: queue.length });
      }
    }

    const pool = Array.from({ length: Math.min(BATCH_CONCURRENCY, queue.length) }, worker);
    await Promise.all(pool);
    setProcessing(false);
  }

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <Logo />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">DocFlow AI</h1>
            <p className="text-xs text-slate-500">Document automation, structured in seconds.</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {/* Mode toggle */}
        <div className="mb-6 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {[
            { id: 'single', label: 'Single document' },
            { id: 'batch', label: 'Batch (up to 10)' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => switchMode(m.id)}
              disabled={loading || processing}
              className={[
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed',
                mode === m.id ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900',
              ].join(' ')}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Doc type tabs (shared — applies to single doc or whole batch) */}
        <div className="mb-6">
          <p className="mb-2 text-sm font-medium text-slate-700">
            Document type {mode === 'batch' && <span className="text-slate-400">(applies to all files)</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            {DOC_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => resetType(t.id)}
                disabled={loading || processing}
                className={[
                  'flex flex-col items-start rounded-xl border px-4 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                  docType === t.id
                    ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-300'
                    : 'border-slate-200 bg-white hover:border-brand-300',
                ].join(' ')}
              >
                <span className={`text-sm font-semibold ${docType === t.id ? 'text-brand-700' : 'text-slate-800'}`}>
                  {t.label}
                </span>
                <span className="text-xs text-slate-500">{t.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ---- SINGLE MODE ---- */}
        {mode === 'single' && (
          <>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <Uploader
                  file={file}
                  onFile={setFile}
                  text={text}
                  onText={setText}
                  onLocalError={setError}
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="animate-fade-in rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {loading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
                      </svg>
                      Extracting…
                    </>
                  ) : (
                    'Extract Data'
                  )}
                </button>
              </div>
            </form>

            {loading && (
              <div className="mt-8 animate-pulse space-y-3">
                <div className="h-24 rounded-xl bg-slate-200" />
                <div className="h-40 rounded-xl bg-slate-200" />
              </div>
            )}

            {!loading && result && (
              <div className="mt-8">
                <Results docType={result.docType} data={result.data} />
              </div>
            )}
          </>
        )}

        {/* ---- BATCH MODE ---- */}
        {mode === 'batch' && (
          <>
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <BatchUploader items={items} onAdd={addFiles} onRemove={removeItem} disabled={processing} />
              </div>

              {batchError && (
                <div className="animate-fade-in rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {batchError}
                </div>
              )}

              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={runBatch}
                  disabled={!canRunBatch}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {processing ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
                      </svg>
                      Processing {progress.done} of {progress.total}…
                    </>
                  ) : (
                    `Extract Data${items.length > 0 ? ` (${items.length})` : ''}`
                  )}
                </button>
                {processing && (
                  <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-brand-600 transition-all duration-300"
                      style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8">
              <BatchResults items={items} docType={docType} />
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-5 text-center text-sm text-slate-500">
        Powered by <span className="font-semibold text-slate-700">Jesxen</span>
      </footer>
    </div>
  );
}
