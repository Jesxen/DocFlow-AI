import { ResultView } from './Results';
import { downloadBatchCsv, downloadBatchJson } from '../export';

function statusDot(status) {
  if (status === 'done') return 'bg-emerald-500';
  if (status === 'error') return 'bg-red-500';
  if (status === 'processing') return 'bg-amber-500';
  return 'bg-slate-300';
}

export default function BatchResults({ items, docType }) {
  const finished = items.filter((it) => it.status === 'done' || it.status === 'error');
  if (finished.length === 0) return null;

  const successful = items
    .filter((it) => it.status === 'done')
    .map((it) => ({ filename: it.file.name, data: it.data }));

  const doneCount = successful.length;
  const errCount = items.filter((it) => it.status === 'error').length;

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Batch Results</h2>
          <p className="text-xs text-slate-500">
            {doneCount} extracted{errCount > 0 && <span className="text-red-600"> · {errCount} failed</span>}
          </p>
        </div>
        {doneCount > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => downloadBatchCsv(docType, successful)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Export All CSV
            </button>
            <button
              onClick={() => downloadBatchJson(docType, successful)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Export All JSON
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {items.map((it) => {
          if (it.status !== 'done' && it.status !== 'error') return null;
          return (
            <details
              key={it.id}
              open={it.status === 'error'}
              className="group rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot(it.status)}`} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800" title={it.file.name}>
                  {it.file.name}
                </span>
                {it.status === 'error' ? (
                  <span className="shrink-0 text-xs font-medium text-red-600">Failed</span>
                ) : (
                  <span className="shrink-0 text-xs text-slate-400">Done</span>
                )}
                <svg
                  className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <div className="border-t border-slate-100 px-4 py-4">
                {it.status === 'error' ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {it.error || 'Extraction failed for this file.'}
                  </p>
                ) : (
                  <ResultView docType={docType} data={it.data} />
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
