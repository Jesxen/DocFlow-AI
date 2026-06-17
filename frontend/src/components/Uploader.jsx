import { useRef, useState } from 'react';
import { fileError } from '../fileRules';

export default function Uploader({ file, onFile, text, onText, onLocalError, disabled }) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  function validateAndSet(f) {
    if (!f) return;
    const err = fileError(f);
    if (err) {
      onLocalError(err);
      return;
    }
    onLocalError('');
    onFile(f);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    if (disabled) return;
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    validateAndSet(f);
  }

  return (
    <div className="space-y-4">
      {/* Drag & drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current && inputRef.current.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) inputRef.current?.click();
        }}
        className={[
          'flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors cursor-pointer',
          dragActive ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50 hover:border-brand-400',
          disabled ? 'opacity-60 cursor-not-allowed' : '',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.pdf"
          className="hidden"
          disabled={disabled}
          onChange={(e) => validateAndSet(e.target.files && e.target.files[0])}
        />
        <svg className="mb-3 h-10 w-10 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4 4 4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        {file ? (
          <div className="text-sm">
            <p className="font-medium text-slate-800">{file.name}</p>
            <p className="text-slate-500">{(file.size / 1024).toFixed(1)} KB · click to replace</p>
            <button
              type="button"
              className="mt-2 text-xs font-medium text-red-600 hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                onFile(null);
              }}
            >
              Remove file
            </button>
          </div>
        ) : (
          <div className="text-sm text-slate-600">
            <p className="font-medium text-slate-800">Drag &amp; drop a file here</p>
            <p>or click to browse · .txt or .pdf · up to 5MB</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        or paste text
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      {/* Paste text */}
      <textarea
        value={text}
        onChange={(e) => onText(e.target.value)}
        disabled={disabled || !!file}
        placeholder={file ? 'Using uploaded file — remove it to paste text instead.' : 'Paste your document text here…'}
        rows={6}
        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-slate-100 disabled:text-slate-400"
      />
    </div>
  );
}
