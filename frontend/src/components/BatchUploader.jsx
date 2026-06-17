import { useRef, useState } from 'react';
import { MAX_BATCH_FILES } from '../fileRules';

function StatusBadge({ status }) {
  const map = {
    queued: { label: 'Queued', cls: 'bg-slate-100 text-slate-600' },
    processing: { label: 'Processing', cls: 'bg-amber-100 text-amber-700' },
    done: { label: 'Done', cls: 'bg-emerald-100 text-emerald-700' },
    error: { label: 'Failed', cls: 'bg-red-100 text-red-700' },
  };
  const s = map[status] || map.queued;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>
      {status === 'processing' && (
        <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
        </svg>
      )}
      {s.label}
    </span>
  );
}

export default function BatchUploader({ items, onAdd, onRemove, disabled }) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const full = items.length >= MAX_BATCH_FILES;

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    if (disabled) return;
    onAdd(e.dataTransfer.files);
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !full) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && !full && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled && !full) inputRef.current?.click();
        }}
        className={[
          'flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-7 text-center transition-colors',
          full || disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          dragActive ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50 hover:border-brand-400',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.pdf"
          multiple
          className="hidden"
          disabled={disabled || full}
          onChange={(e) => {
            onAdd(e.target.files);
            e.target.value = ''; // allow re-selecting the same file
          }}
        />
        <svg className="mb-3 h-9 w-9 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4 4 4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        <div className="text-sm text-slate-600">
          <p className="font-medium text-slate-800">
            {full ? `Maximum ${MAX_BATCH_FILES} files reached` : 'Drag & drop files here'}
          </p>
          {!full && <p>or click to browse · multiple .txt or .pdf · up to 5MB each</p>}
        </div>
      </div>

      {/* Queue */}
      {items.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">
              Files in batch <span className="text-slate-400">({items.length}/{MAX_BATCH_FILES})</span>
            </p>
          </div>
          <ul className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-2">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <svg className="h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v4a1 1 0 0 0 1 1h4" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h9l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                </svg>
                <span className="min-w-0 flex-1 truncate font-medium text-slate-800" title={it.file.name}>
                  {it.file.name}
                </span>
                <span className="shrink-0 text-xs text-slate-400">{(it.file.size / 1024).toFixed(0)} KB</span>
                <StatusBadge status={it.status} />
                <button
                  type="button"
                  onClick={() => onRemove(it.id)}
                  disabled={disabled}
                  aria-label={`Remove ${it.file.name}`}
                  className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
